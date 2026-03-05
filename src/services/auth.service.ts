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

	/**
	 * Safely verifies a password against a user's hash while mitigating timing attacks.
	 * It ensures the verification process takes roughly the same amount of time
	 * whether the user exists, doesn't exist, or is an OAuth user.
	 */
	private async verifyPasswordSafe(password: string, user: User | null): Promise<boolean> {
		// Construct a dummy hash using the same iteration count to simulate the exact CPU load.
		// The salt and hash parts just need to be valid Base64 strings to pass the format check.
		const dummySalt = 'U29tZVJhbmRvbVNhbHQ='; // "SomeRandomSalt"
		const dummyHashPart = 'U29tZVJhbmRvbUhhc2g='; // "SomeRandomHash"
		const dummyHash = `${this.hashIterations}:${dummySalt}:${dummyHashPart}`;

		// Check if we have a valid user with a password (not OAuth)
		// We explicitly check for null user here to satisfy TypeScript in the targetHash selection
		const isRealUserWithPassword = !!user && !user.phash.startsWith('OAUTH:');

		// If user exists and has a real password, use it. Otherwise, use the dummy.
		// We verify against the dummy hash to consume CPU cycles even if the user is invalid.
		const targetHash = isRealUserWithPassword ? (user as User).phash : dummyHash;

		// Perform verification (always takes ~100ms+ depending on configured iterations)
		const isMatch = await verifyPassword(password, targetHash);

		// Return true only if it was a real user match
		return isRealUserWithPassword && isMatch;
	}

	private async createSessionForUser(user: any, ip: string, userAgent: string): Promise<string> {
		let userMetadata = {};
		try {
			userMetadata = user.metadata ? JSON.parse(user.metadata) : {};
		} catch (e) {
			console.error('Failed to parse user metadata', e);
		}

		// Session IDs remain random UUIDv4s since they are stored in KV, not D1 B-Trees
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

	async login(email: string, password: string, appId: string, ip: string, userAgent: string): Promise<{ sessionId: string; app: string }> {
		const attempts = await this.loginAttemptRepo.getAttempts(email);
		if (attempts >= 5) {
			await this.auditLogRepo.log({ action: 'login_locked_out', email, ip, userAgent, details: { attempts } });
			throw new AppError('Too many failed login attempts. Please try again in 15 minutes.', 429);
		}

		const user = await this.userRepo.findForLogin(email, appId);

		// Use the safe verification helper to mitigate timing attacks
		const isPasswordVerified = await this.verifyPasswordSafe(password, user);

		if (!user || !isPasswordVerified) {
			await this.loginAttemptRepo.incrementAttempts(email);
			// Security Note: We still log "invalid_credentials" generically to internal logs
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
			throw new AppError('EMAIL_NOT_VERIFIED', 403);
		}

		await this.loginAttemptRepo.clearAttempts(email);
		const sessionId = await this.createSessionForUser(user, ip, userAgent);

		await this.auditLogRepo.log({
			action: 'login_success',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
			details: { appId, sessionId, method: 'password' },
		});

		return { sessionId, app: user.app };
	}

	async loginWithOAuth(
		email: string,
		provider: string,
		appId: string,
		ip: string,
		userAgent: string,
	): Promise<{ sessionId: string; app: string }> {
		// 1. Find or Create User
		let user = await this.userRepo.findForLogin(email, appId);

		if (!user) {
			// Auto-provision an SSO account for OAuth users if they don't exist
			const userId = generateUUIDv7();
			await this.userRepo.create({
				id: userId,
				app: 'sso',
				email,
				phash: `OAUTH:${provider.toUpperCase()}`,
				metadata: JSON.stringify({ provider }),
				email_verified: 1, // OAuth emails are usually verified by the provider
				token_version: 1,
			});
			user = await this.userRepo.findById(userId);
		}

		if (!user) throw new AppError('Failed to sync user', 500);

		const sessionId = await this.createSessionForUser(user, ip, userAgent);

		await this.auditLogRepo.log({
			action: 'login_success',
			userId: user.id,
			email: user.email,
			ip,
			userAgent,
			details: { appId: user.app, sessionId, method: `oauth_${provider}` },
		});

		return { sessionId, app: user.app };
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

		await this.auditLogRepo.log({
			action: 'email_verified',
			userId,
			ip,
			userAgent,
		});
	}

	/**
	 * Revokes a SPECIFIC session.
	 */
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

	/**
	 * Revokes all sessions for a SPECIFIC user account (ID).
	 */
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

	/**
	 * Revokes all sessions for EVERY account associated with this email
	 * (e.g. 'sso', 'geveze', 'hodan' accounts for the same user).
	 */
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

		// Security: Always respond with success to prevent email enumeration
		// But we can log the attempt internally
		await this.auditLogRepo.log({
			action: 'password_reset_requested',
			email,
			userId: user?.id || null, // null if user doesn't exist
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

		await this.auditLogRepo.log({
			action: 'password_reset_success',
			userId,
			ip,
			userAgent,
		});

		return user.app;
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
