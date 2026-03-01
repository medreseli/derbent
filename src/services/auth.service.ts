import { hashPassword, verifyPassword } from '../utils/crypto';
import { Session } from '../types/session';
import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { TokenRepository } from '../repositories/token.repository';
import { EmailService } from './email.service';
import { AppError } from '../types/errors';

export class AuthService {
	constructor(
		private userRepo: UserRepository,
		private sessionRepo: SessionRepository,
		private tokenRepo: TokenRepository,
		private emailService: EmailService,
	) {}

	async login(email: string, password: string, appId: string): Promise<{ sessionId: string; app: string }> {
		const user = await this.userRepo.findForLogin(email, appId);

		let isPasswordVerified = false;
		if (user) isPasswordVerified = await verifyPassword(password, user.phash);

		if (!user || !isPasswordVerified) {
			throw new AppError('Invalid email or password', 401);
		}

		if (user.email_verified === 0) {
			throw new AppError('EMAIL_NOT_VERIFIED', 403);
		}

		const sessionId = crypto.randomUUID();
		const session: Session = {
			userId: user.id,
			email: user.email,
			role: 'user',
			appId: user.app,
			createdAt: Date.now(),
		};

		await this.sessionRepo.create(sessionId, session);
		return { sessionId, app: user.app };
	}

	async register(email: string, password: string, appId: string): Promise<void> {
		const existingSso = await this.userRepo.findByEmailAndApp(email, 'sso');
		if (existingSso) throw new AppError('An SSO account already exists for this email.');

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
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
		});

		// Email Verification Flow
		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, userId);
		await this.emailService.sendVerificationEmail(email, token);
	}

	async requestNewVerification(email: string, appId: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, appId);

		// Security: Don't tell the caller if the user exists or is already verified
		if (!user || user.email_verified === 1) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.saveEmailVerificationToken(token, user.id);
		await this.emailService.sendVerificationEmail(email, token);
	}

	async verifyEmailToken(token: string): Promise<void> {
		const userId = await this.tokenRepo.getUserIdFromVerifyToken(token);
		if (!userId) {
			throw new AppError('Verification link is invalid or has expired.', 400);
		}

		await this.userRepo.markEmailVerified(userId);
		await this.tokenRepo.deleteEmailVerificationToken(token);
	}

	async logout(sessionId: string): Promise<void> {
		await this.sessionRepo.delete(sessionId);
	}

	async verifySession(sessionId: string, requiredAppId: string): Promise<Session> {
		const session = await this.sessionRepo.get(sessionId);

		if (!session) throw new AppError('Session not found', 401);

		if (session.appId !== requiredAppId && session.appId !== 'sso') {
			throw new AppError('Forbidden', 403);
		}

		return session;
	}

	async requestPasswordReset(email: string): Promise<void> {
		const user = await this.userRepo.findByEmailAndApp(email, 'sso');

		// Security: Always respond with success to prevent email enumeration
		if (!user) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.savePasswordResetToken(token, user.id);
		await this.emailService.sendPasswordResetEmail(email, token);
	}

	async resetPassword(token: string, newPassword: string): Promise<void> {
		const userId = await this.tokenRepo.getUserIdFromResetToken(token);
		if (!userId) {
			throw new AppError('Reset link is invalid or has expired.', 400);
		}

		const phash = await hashPassword(newPassword);
		await this.userRepo.updatePassword(userId, phash);
		await this.tokenRepo.deletePasswordResetToken(token);
	}

	async requestMagicLink(email: string, appId: string, redirect: string): Promise<void> {
		const user = await this.userRepo.findForLogin(email, appId);

		// Security: Return success silently even if user doesn't exist
		if (!user) return;

		const token = crypto.randomUUID();
		await this.tokenRepo.saveMagicLinkToken(token, user.id);
		await this.emailService.sendMagicLinkEmail(email, token, appId, redirect);
	}

	async verifyMagicLink(token: string, requiredAppId: string): Promise<{ sessionId: string; app: string }> {
		const userId = await this.tokenRepo.getUserIdFromMagicLinkToken(token);
		if (!userId) {
			throw new AppError('Magic link is invalid or has expired.', 400);
		}

		const user = await this.userRepo.findById(userId);
		if (!user) {
			throw new AppError('User not found.', 400);
		}

		// Verify the user is allowed to access the requested app context
		if (user.app !== requiredAppId && user.app !== 'sso') {
			throw new AppError('Forbidden: You do not have access to this app.', 403);
		}

		// Magic links inherently verify the email address since they require inbox access
		if (user.email_verified === 0) {
			await this.userRepo.markEmailVerified(user.id);
		}

		// Ensure one-time use
		await this.tokenRepo.deleteMagicLinkToken(token);

		const sessionId = crypto.randomUUID();
		const session: Session = {
			userId: user.id,
			email: user.email,
			role: 'user',
			appId: user.app,
			createdAt: Date.now(),
		};

		await this.sessionRepo.create(sessionId, session);
		return { sessionId, app: user.app };
	}
}
