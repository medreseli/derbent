import { hashPassword, verifyPassword } from '../utils/crypto';
import { Session } from '../types/session';
import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { TokenRepository } from '../repositories/token.repository';
import { EmailService } from './email.service';
import { AppError } from '../types/errors';
import { UserTokenVersionRepository } from '../repositories/user-token-version.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { LoginAttemptRepository } from '../repositories/login-attempt.repository';
import { generateUUIDv7 } from '../utils/uuid';
import { User } from '../types/user';
import { LoginResult } from '../types/auth';
import { verifyTOTP } from '../utils/totp';

export class AuthService {
	constructor(
		private userRepo: UserRepository,
		private sessionRepo: SessionRepository,
		private tokenRepo: TokenRepository,
		private userTokenVersionRepo: UserTokenVersionRepository,
		private emailService: EmailService,
		private auditLogRepo: AuditLogRepository,
		private loginAttemptRepo: LoginAttemptRepository,
		private hashIterations: number,
	) {}

	private async verifyPasswordSafe(password: string, user: User | null): Promise<boolean> {
		const dummySalt = 'U29tZVJhbmRvbVNhbHQ=';
		const dummyHashPart = 'U29tZVJhbmRvbUhhc2g=';
		const dummyHash = `${this.hashIterations}:${dummySalt}:${dummyHashPart}`;
		const isRealUserWithPassword = !!user && !user.phash.startsWith('OAUTH:');
		const targetHash = isRealUserWithPassword ? (user as User).phash : dummyHash;
		const isMatch = await verifyPassword(password, targetHash);
		return isRealUserWithPassword && isMatch;
	}

	private async createSessionForUser(user: any, ip: string, userAgent: string): Promise<string> {
		let userMetadata = {};
		try {
			userMetadata = user.metadata ? JSON.parse(user.metadata) : {};
		} catch (e) {
			console.error('Failed to parse user metadata', e);
		}

		const sessionId = crypto.randomUUID();
		const session: Session = {
			userId: user.id,
			email: user.email,
			role: 'user',
			appId: user.app,
			createdAt: Date.now(),
			ip,
			userAgent,
			tokenVersion: user.token_version,
			data: userMetadata,
		};

		await this.sessionRepo.create(sessionId, session);
		await this.userTokenVersionRepo.setUserVersion(user.id, user.token_version);
		return sessionId;
	}

	private async handleSuccessfulAuthentication(
		user: User,
		appId: string,
		ip: string,
		userAgent: string,
		method: string,
	): Promise<LoginResult> {
		if (user.two_factor_enabled === 1) {
			const token = crypto.randomUUID();
			await this.tokenRepo.saveTwoFactorLoginToken(token, { userId: user.id, appId, ip, userAgent });
			return { requires2FA: true, twoFactorToken: token, app: user.app };
		} else {
			const sessionId = await this.createSessionForUser(user, ip, userAgent);
			await this.auditLogRepo.log({
				action: 'login_success',
				userId: user.id,
				email: user.email,
				ip,
				userAgent,
				details: { appId: user.app, sessionId, method },
			});
			return { requires2FA: false, sessionId, app: user.app };
		}
	}

	async getUser(userId: string): Promise<User | null> {
		return await this.userRepo.findById(userId);
	}

	async login(email: string, password: string, appId: string, ip: string, userAgent: string): Promise<LoginResult> {
		const attempts = await this.loginAttemptRepo.getAttempts(email);
		if (attempts >= 5) {
			await this.auditLogRepo.log({ action: 'login_locked_out', email, ip, userAgent, details: { attempts } });
			throw new AppError('Too many failed login attempts. Please try again in 15 minutes.', 429);
		}

		const user = await this.userRepo.findForLogin(email, appId);
		const isPasswordVerified = await this.verifyPasswordSafe(password, user);

		if (!user || !isPasswordVerified) {
			await this.loginAttemptRepo.incrementAttempts(email);
			await this.auditLogRepo.log({
				action: 'login_failed',
				email,
				ip,
				userAgent,
				details: { reason: 'invalid_credentials', appId },
			});
			throw new AppError('Invalid email or password', 401);
		}

		if (user.is_locked === 1) {
			await this.auditLogRepo.log({
				action: 'login_failed_locked',
				email,
				ip,
				userAgent,
				details: { appId },
			});
			throw new AppError('This account has been locked. Please contact support.', 403);
		}

		if (user.email_verified === 0) {
			throw new AppError('EMAIL_NOT_VERIFIED', 403);
		}

		await this.loginAttemptRepo.clearAttempts(email);
		return this.handleSuccessfulAuthentication(user, appId, ip, userAgent, 'password');
	}

	async loginWithOAuth(email: string, provider: string, appId: string, ip: string, userAgent: string): Promise<LoginResult> {
		let user = await this.userRepo.findForLogin(email, appId);

		if (!user) {
			const userId = generateUUIDv7();
			await this.userRepo.create({
				id: userId,
				app: 'sso',
				email,
				phash: `OAUTH:${provider.toUpperCase()}`,
				metadata: JSON.stringify({ provider }),
				email_verified: 1,
				token_version: 1,
				two_factor_secret: null,
				two_factor_enabled: 0,
				is_locked: 0,
			});
			user = await this.userRepo.findById(userId);
		}

		if (!user) throw new AppError('Failed to sync user', 500);

		if (user.is_locked === 1) {
			throw new AppError('This account has been locked. Please contact support.', 403);
		}

		return this.handleSuccessfulAuthentication(user, appId, ip, userAgent, `oauth_${provider}`);
	}

	async register(email: string, password: string, appId: string, redirect: string, ip: string, userAgent: string): Promise<void> {
		const existingSso = await this.userRepo.findByEmailAndApp(email, 'sso');
		if (existingSso) throw new AppError('An SSO account already exists for this email.');

		if (appId !== 'sso') {
			const existingAppUser = await this.userRepo.findByEmailAndApp(email, appId);
			if (existingAppUser) throw new AppError('Account already exists for this app.');
		} else {
			if (await this.userRepo.hasAnyAppAccount(email)) throw new AppError('An app-level account already exists for this email.');
		}

		const phash = await hashPassword(password, this.hashIterations);
		const userId = generateUUIDv7();

		await this.userRepo.create({
			id: userId,
			app: appId,
			email,
			phash,
			metadata: '{}',
			email_verified: 0,
			token_version: 1,
			two_factor_secret: null,
			two_factor_enabled: 0,
			is_locked: 0,
		});

		await this.auditLogRepo.log({ action: 'register', userId, email, ip, userAgent, details: { appId } });

		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, userId);
		await this.emailService.sendVerificationEmail(email, token, appId, redirect);
	}

	async requestNewVerification(email: string, appId: string, redirect: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, appId);
		if (!user || user.email_verified === 1) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, user.id);
		await this.emailService.sendVerificationEmail(email, token, appId, redirect);

		await this.auditLogRepo.log({
			action: 'verification_email_requested',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
		});
	}

	async verifySession(sessionId: string, requiredAppId: string, currentIp?: string, currentUserAgent?: string): Promise<Session> {
		const session = await this.sessionRepo.get(sessionId);
		if (!session) throw new AppError('Session not found', 401);
		if (session.appId !== requiredAppId && session.appId !== 'sso') throw new AppError('Forbidden', 403);

		if (currentUserAgent && session.userAgent !== currentUserAgent) {
			await this.auditLogRepo.log({
				action: 'security_alert_hijack',
				userId: session.userId,
				email: session.email,
				ip: currentIp,
				userAgent: currentUserAgent,
			});
			throw new AppError('Session invalid (Client Mismatch)', 401);
		}

		let currentVersion = await this.userTokenVersionRepo.getUserVersion(session.userId);
		if (currentVersion === null) {
			const user = await this.userRepo.findById(session.userId);
			if (!user) throw new AppError('User not found', 401);
			currentVersion = user.token_version;
			await this.userTokenVersionRepo.setUserVersion(user.id, currentVersion);
		}

		if (session.tokenVersion !== currentVersion) {
			throw new AppError('Session expired (Revoked)', 401);
		}

		return session;
	}

	async verifyEmailToken(token: string, ip: string, userAgent: string): Promise<void> {
		const userId = await this.tokenRepo.getUserIdFromVerifyToken(token);
		if (!userId) {
			await this.auditLogRepo.log({
				action: 'verify_email_failed',
				ip,
				userAgent,
				details: { reason: 'invalid_token' },
			});
			throw new AppError('Verification link is invalid or has expired.', 400);
		}

		await this.userRepo.markEmailVerified(userId);
		await this.tokenRepo.deleteEmailVerificationToken(token);

		await this.auditLogRepo.log({ action: 'email_verified', userId, ip, userAgent });
	}

	async logout(sessionId: string): Promise<void> {
		const session = await this.sessionRepo.get(sessionId);
		await this.sessionRepo.delete(sessionId);

		if (session) {
			await this.auditLogRepo.log({
				action: 'logout',
				userId: session.userId,
				email: session.email,
				ip: session.ip,
				details: { appId: session.appId },
			});
		}
	}

	async logoutAll(userId: string, ip: string, userAgent: string): Promise<void> {
		const newVersion = await this.userRepo.incrementTokenVersion(userId);
		await this.userTokenVersionRepo.setUserVersion(userId, newVersion);
		await this.auditLogRepo.log({ action: 'logout_all_devices', userId, ip, userAgent });
	}

	async logoutAllByEmail(email: string, ip: string, userAgent: string): Promise<void> {
		const users = await this.userRepo.findAllByEmail(email);
		for (const user of users) {
			const newVersion = await this.userRepo.incrementTokenVersion(user.id);
			await this.userTokenVersionRepo.setUserVersion(user.id, newVersion);
		}

		await this.auditLogRepo.log({
			action: 'logout_all_by_email',
			email,
			ip,
			userAgent,
			details: { affectedAccounts: users.length },
		});
	}

	async requestPasswordReset(email: string, appId: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, appId);
		await this.auditLogRepo.log({
			action: 'password_reset_requested',
			email,
			userId: user?.id || null,
			ip,
			userAgent,
			details: { appId, userExists: !!user },
		});

		if (!user) return;
		const token = crypto.randomUUID();
		await this.tokenRepo.savePasswordResetToken(token, user.id);
		await this.emailService.sendPasswordResetEmail(email, token);
	}

	async resetPassword(token: string, newPassword: string, ip: string, userAgent: string): Promise<string> {
		const userId = await this.tokenRepo.getUserIdFromResetToken(token);
		if (!userId) {
			await this.auditLogRepo.log({
				action: 'password_reset_failed',
				ip,
				userAgent,
				details: { reason: 'invalid_token' },
			});
			throw new AppError('Reset link is invalid or has expired.', 400);
		}

		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found.', 400);

		const phash = await hashPassword(newPassword, this.hashIterations);
		await this.userRepo.updatePassword(userId, phash);
		await this.userTokenVersionRepo.clearUserVersion(userId);
		await this.tokenRepo.deletePasswordResetToken(token);

		await this.auditLogRepo.log({ action: 'password_reset_success', userId, ip, userAgent });
		return user.app;
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found.', 404);

		if (user.phash.startsWith('OAUTH:')) {
			throw new AppError('Password cannot be changed for OAuth accounts.', 400);
		}

		const isPasswordVerified = await this.verifyPasswordSafe(currentPassword, user);
		if (!isPasswordVerified) {
			await this.auditLogRepo.log({
				action: 'change_password_failed',
				userId,
				ip,
				userAgent,
				details: { reason: 'invalid_current_password' },
			});
			throw new AppError('Incorrect current password.', 400);
		}

		const phash = await hashPassword(newPassword, this.hashIterations);
		await this.userRepo.updatePassword(userId, phash);
		await this.userTokenVersionRepo.clearUserVersion(userId);

		await this.auditLogRepo.log({ action: 'password_changed', userId, ip, userAgent });
	}

	async requestMagicLink(email: string, appId: string, redirect: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findForLogin(email, appId);
		await this.auditLogRepo.log({
			action: 'magic_link_requested',
			email,
			userId: user?.id || null,
			ip,
			userAgent,
			details: { appId, userExists: !!user },
		});

		if (!user) return;
		const token = crypto.randomUUID();
		await this.tokenRepo.saveMagicLinkToken(token, user.id);
		await this.emailService.sendMagicLinkEmail(email, token, appId, redirect);
	}

	async verifyMagicLink(token: string, requiredAppId: string, ip: string, userAgent: string): Promise<LoginResult> {
		const userId = await this.tokenRepo.getUserIdFromMagicLinkToken(token);
		if (!userId) {
			await this.auditLogRepo.log({
				action: 'magic_link_failed',
				ip,
				userAgent,
				details: { reason: 'invalid_token' },
			});
			throw new AppError('Magic link is invalid or has expired.', 400);
		}

		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found.', 400);

		if (user.app !== requiredAppId && user.app !== 'sso') {
			await this.auditLogRepo.log({
				action: 'magic_link_forbidden',
				userId,
				email: user.email,
				ip,
				userAgent,
				details: { requiredAppId, userApp: user.app },
			});
			throw new AppError('Forbidden: You do not have access to this app.', 403);
		}

		if (user.email_verified === 0) {
			await this.userRepo.markEmailVerified(user.id);
		}

		await this.tokenRepo.deleteMagicLinkToken(token);
		await this.userTokenVersionRepo.setUserVersion(user.id, user.token_version);

		return this.handleSuccessfulAuthentication(user, requiredAppId, ip, userAgent, 'magic_link');
	}

	async verifyTwoFactorLogin(token: string, code: string, ip: string, userAgent: string): Promise<LoginResult> {
		const loginData = await this.tokenRepo.getTwoFactorLoginData(token);
		if (!loginData) throw new AppError('Session expired. Please log in again.', 401);

		const user = await this.userRepo.findById(loginData.userId);
		if (!user || user.two_factor_enabled === 0 || !user.two_factor_secret) {
			throw new AppError('Invalid request.', 400);
		}

		const isValid = await verifyTOTP(user.two_factor_secret, code);
		if (!isValid) {
			await this.auditLogRepo.log({
				action: 'login_2fa_failed',
				userId: user.id,
				ip,
				userAgent,
			});
			throw new AppError('Invalid two-factor code.', 400);
		}

		await this.tokenRepo.deleteTwoFactorLoginToken(token);

		const sessionId = await this.createSessionForUser(user, ip, userAgent);

		await this.auditLogRepo.log({
			action: 'login_success',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
			details: { appId: loginData.appId, sessionId, method: '2fa' },
		});

		return { requires2FA: false, sessionId, app: user.app };
	}

	async enableTwoFactor(userId: string, code: string): Promise<void> {
		const secret = await this.tokenRepo.getTwoFactorSetupSecret(userId);
		if (!secret) throw new AppError('Setup session expired. Please try again.', 400);

		const isValid = await verifyTOTP(secret, code);
		if (!isValid) throw new AppError('Invalid code. Please try again.', 400);

		await this.userRepo.enableTwoFactor(userId, secret);
		await this.tokenRepo.deleteTwoFactorSetupSecret(userId);

		await this.auditLogRepo.log({ action: '2fa_enabled', userId });
	}

	async disableTwoFactor(userId: string, code: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
			throw new AppError('2FA is not enabled.', 400);
		}

		const isValid = await verifyTOTP(user.two_factor_secret, code);
		if (!isValid) throw new AppError('Invalid code.', 400);

		await this.userRepo.disableTwoFactor(userId);

		await this.auditLogRepo.log({ action: '2fa_disabled', userId });
	}

	async getTwoFactorSetupSecret(userId: string): Promise<string | null> {
		return await this.tokenRepo.getTwoFactorSetupSecret(userId);
	}

	async saveTwoFactorSetupSecret(userId: string, secret: string): Promise<void> {
		await this.tokenRepo.saveTwoFactorSetupSecret(userId, secret);
	}
}
