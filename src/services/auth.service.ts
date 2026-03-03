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

export class AuthService {
	constructor(
		private userRepo: UserRepository,
		private sessionRepo: SessionRepository,
		private tokenRepo: TokenRepository,
		private userTokenVersionRepo: UserTokenVersionRepository,
		private emailService: EmailService,
		private auditLogRepo: AuditLogRepository,
		private loginAttemptRepo: LoginAttemptRepository,
	) {}

	async login(email: string, password: string, appId: string, ip: string, userAgent: string): Promise<{ sessionId: string; app: string }> {
		const attempts = await this.loginAttemptRepo.getAttempts(email);
		if (attempts >= 5) {
			await this.auditLogRepo.log({
				action: 'login_locked_out',
				email,
				ip,
				userAgent,
				details: { attempts },
			});
			throw new AppError('Too many failed login attempts. Please try again in 15 minutes.', 429);
		}

		const user = await this.userRepo.findForLogin(email, appId);

		let isPasswordVerified = false;
		if (user) isPasswordVerified = await verifyPassword(password, user.phash);

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

		if (user.email_verified === 0) {
			await this.auditLogRepo.log({
				action: 'login_failed',
				userId: user.id,
				email: user.email,
				ip,
				userAgent,
				details: { reason: 'email_not_verified', appId },
			});
			throw new AppError('EMAIL_NOT_VERIFIED', 403);
		}

		await this.loginAttemptRepo.clearAttempts(email);
		await this.userTokenVersionRepo.setUserVersion(user.id, user.token_version);

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

		await this.auditLogRepo.log({
			action: 'login_success',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
			details: { appId, sessionId },
		});

		return { sessionId, app: user.app };
	}

	async register(email: string, password: string, appId: string, ip: string, userAgent: string): Promise<void> {
		const existingSso = await this.userRepo.findByEmailAndApp(email, 'sso');
		if (existingSso) {
			// Don't log failure here to avoid noise, or log as 'register_attempt_duplicate'
			throw new AppError('An SSO account already exists for this email.');
		}

		if (appId !== 'sso') {
			const existingAppUser = await this.userRepo.findByEmailAndApp(email, appId);
			if (existingAppUser) throw new AppError('Account already exists for this app.');
		} else {
			if (await this.userRepo.hasAnyAppAccount(email)) {
				throw new AppError('An app-level account already exists for this email.');
			}
		}

		const phash = await hashPassword(password);
		const userId = crypto.randomUUID();

		await this.userRepo.create({
			id: userId,
			app: appId,
			email,
			phash,
			metadata: '{}',
			email_verified: 0,
			token_version: 1,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		await this.auditLogRepo.log({
			action: 'register',
			userId,
			email,
			ip,
			userAgent,
			details: { appId },
		});

		// Email Verification Flow
		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, userId);
		await this.emailService.sendVerificationEmail(email, token);
	}

	async requestNewVerification(email: string, appId: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, appId);

		if (!user || user.email_verified === 1) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, user.id);
		await this.emailService.sendVerificationEmail(email, token);

		await this.auditLogRepo.log({
			action: 'verification_email_requested',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
		});
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

		await this.auditLogRepo.log({
			action: 'email_verified',
			userId,
			ip,
			userAgent,
		});
	}

	async logout(sessionId: string): Promise<void> {
		// Optional: Fetch session before deleting to log who logged out
		const session = await this.sessionRepo.get(sessionId);
		await this.sessionRepo.delete(sessionId);

		if (session) {
			await this.auditLogRepo.log({
				action: 'logout',
				userId: session.userId,
				email: session.email,
				ip: session.ip, // Log the IP stored in session, or we could pass current IP
				details: { appId: session.appId },
			});
		}
	}

	async logoutAll(userId: string, ip: string, userAgent: string): Promise<void> {
		const newVersion = await this.userRepo.incrementTokenVersion(userId);
		await this.userTokenVersionRepo.setUserVersion(userId, newVersion);
		await this.auditLogRepo.log({
			action: 'logout_all_devices',
			userId,
			ip,
			userAgent,
		});
	}

	async verifySession(sessionId: string, requiredAppId: string, currentIp?: string, currentUserAgent?: string): Promise<Session> {
		const session = await this.sessionRepo.get(sessionId);

		if (!session) throw new AppError('Session not found', 401);

		if (session.appId !== requiredAppId && session.appId !== 'sso') {
			throw new AppError('Forbidden', 403);
		}

		// --- Security Checks ---

		// 1. User Agent (Hijack Protection)
		if (currentUserAgent && session.userAgent !== currentUserAgent) {
			console.warn(`[Security] Session Hijack Attempt? UA Mismatch. stored="${session.userAgent}" current="${currentUserAgent}"`);
			await this.auditLogRepo.log({
				action: 'security_alert_hijack',
				userId: session.userId,
				email: session.email,
				ip: currentIp,
				userAgent: currentUserAgent,
				details: { storedUa: session.userAgent },
			});
			throw new AppError('Session invalid (Client Mismatch)', 401);
		}

		// 2. IP Address (Logging only for now)
		if (currentIp && session.ip !== currentIp) {
			console.info(`[Security] IP Changed for user ${session.email}. stored=${session.ip} current=${currentIp}`);
		}

		// 3. Token Version (Global Revocation Check)
		let currentVersion = await this.userTokenVersionRepo.getUserVersion(session.userId);

		if (currentVersion === null) {
			const user = await this.userRepo.findById(session.userId);
			if (!user) throw new AppError('User not found', 401);
			currentVersion = user.token_version;
			await this.userTokenVersionRepo.setUserVersion(user.id, currentVersion);
		}

		if (session.tokenVersion !== currentVersion) {
			console.warn(`[Security] Revoked session access attempt for ${session.email} (v${session.tokenVersion} < v${currentVersion})`);
			await this.auditLogRepo.log({
				action: 'security_alert_revoked',
				userId: session.userId,
				email: session.email,
				ip: currentIp,
				userAgent: currentUserAgent,
			});
			throw new AppError('Session expired (Revoked)', 401);
		}

		return session;
	}

	async requestPasswordReset(email: string, ip: string, userAgent: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, 'sso');

		// Security: Always respond with success to prevent email enumeration
		// But we can log the attempt internally
		await this.auditLogRepo.log({
			action: 'password_reset_requested',
			email,
			userId: user?.id || null, // null if user doesn't exist
			ip,
			userAgent,
			details: { userExists: !!user },
		});

		if (!user) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.savePasswordResetToken(token, user.id);
		await this.emailService.sendPasswordResetEmail(email, token);
	}

	async resetPassword(token: string, newPassword: string, ip: string, userAgent: string): Promise<void> {
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

		const phash = await hashPassword(newPassword);
		await this.userRepo.updatePassword(userId, phash);
		await this.userTokenVersionRepo.clearUserVersion(userId);
		await this.tokenRepo.deletePasswordResetToken(token);

		await this.auditLogRepo.log({
			action: 'password_reset_success',
			userId,
			ip,
			userAgent,
		});
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

	async verifyMagicLink(token: string, requiredAppId: string, ip: string, userAgent: string): Promise<{ sessionId: string; app: string }> {
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
		if (!user) {
			throw new AppError('User not found.', 400);
		}

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

		await this.auditLogRepo.log({
			action: 'magic_link_success',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
			details: { appId: user.app, sessionId },
		});

		return { sessionId, app: user.app };
	}
}
