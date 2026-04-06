import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { AuthHandler } from './handlers/auth.handler';
import { InternalHandler } from './handlers/internal.handler';
import { csrfOnGet, csrfOnPost } from './middleware/csrf.middleware';
import { rateLimit } from './middleware/rate-limit.middleware';
import { SessionRepository } from './repositories/session.repository';
import { TokenRepository } from './repositories/token.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { HonoEnv } from './types/hono-env';
import { Logger } from './utils/logger';
import { renderer } from './ui/layout';
import { UserTokenVersionRepository } from './repositories/user-token-version.repository';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { LoginAttemptRepository } from './repositories/login-attempt.repository';
import { EmailQueueMessage } from './types/queue';
import { adminAuth } from './middleware/admin.middleware';
import { AdminHandler } from './handlers/admin.handler';

const app = new Hono<HonoEnv>();

app.use('*', secureHeaders());
app.get('*', renderer);

app.use('*', async (c, next) => {
	const logger = new Logger(c.env.LOG_LEVEL || 'info');
	c.set('logger', logger);

	const userRepo = new UserRepository(c.env.DB);
	const sessionRepo = new SessionRepository(c.env.KV);
	const tokenRepo = new TokenRepository(c.env.KV);
	const userTokenVersionRepo = new UserTokenVersionRepository(c.env.KV);
	const auditLogRepo = new AuditLogRepository(c.env.DB);
	const loginAttemptRepo = new LoginAttemptRepository(c.env.KV);

	const emailService = new EmailService(c.env.APP_NAME, c.env.BASE_URL, c.env.RESEND_API_KEY, c.env.RESEND_DOMAIN, c.env.EMAIL_QUEUE);

	const hashIterations = parseInt(c.env.PBKDF2_ITERATIONS || '50000', 10);

	const authService = new AuthService(
		userRepo,
		sessionRepo,
		tokenRepo,
		userTokenVersionRepo,
		emailService,
		auditLogRepo,
		loginAttemptRepo,
		hashIterations,
	);
	c.set('authService', authService);

	await next();
});

app.get('/', csrfOnGet(), AuthHandler.index);
app.get('/login', csrfOnGet(), AuthHandler.renderLogin);
app.get('/register', csrfOnGet(), AuthHandler.renderRegister);

// Rate Limited Routes
app.post('/login', rateLimit(), csrfOnPost(), AuthHandler.handleLogin);
app.post('/register', rateLimit(), csrfOnPost(), AuthHandler.handleRegister);
app.post('/logout', rateLimit(), csrfOnPost(), AuthHandler.handleLogout);
app.post('/logout-all', rateLimit(), csrfOnPost(), AuthHandler.handleLogoutAll);
app.post('/logout-all-email', rateLimit(), csrfOnPost(), AuthHandler.handleLogoutAllByEmail);

// Service Binding Routes
app.get('/internal/verify', InternalHandler.verify);
app.post('/internal/logout', InternalHandler.logout);

// Email Verification Routes
app.get('/verify-pending', AuthHandler.renderVerifyPending);
app.get('/verify-email', csrfOnGet(), AuthHandler.handleVerifyEmail);

// Password Reset Routes
app.get('/forgot-password', csrfOnGet(), AuthHandler.renderForgot);
app.post('/forgot-password', csrfOnPost(), AuthHandler.handleForgot);
app.get('/reset-password', csrfOnGet(), AuthHandler.renderReset);
app.post('/reset-password', csrfOnPost(), AuthHandler.handleReset);

// Settings and 2FA Routes
app.get('/change-password', csrfOnGet(), AuthHandler.renderChangePassword);
app.post('/change-password', rateLimit(), csrfOnPost(), AuthHandler.handleChangePassword);

app.get('/2fa/setup', csrfOnGet(), AuthHandler.render2FASetup);
app.post('/2fa/setup', rateLimit(), csrfOnPost(), AuthHandler.handle2FASetup);
app.post('/2fa/disable', rateLimit(), csrfOnPost(), AuthHandler.handle2FADisable);

app.get('/2fa/verify', csrfOnGet(), AuthHandler.render2FAVerify);
app.post('/2fa/verify', rateLimit(), csrfOnPost(), AuthHandler.handle2FAVerify);

// Magic Link Routes
app.get('/magic-link', csrfOnGet(), AuthHandler.renderMagicLink);
app.post('/magic-link', rateLimit(), csrfOnPost(), AuthHandler.handleMagicLinkRequest);
app.get('/verify-magic-link', csrfOnGet(), AuthHandler.handleVerifyMagicLink);

// OAuth Routes
app.get('/auth/github', AuthHandler.handleGitHubLogin);
app.get('/auth/github/callback', AuthHandler.handleGitHubCallback);

// Admin Dashboard Routes
const adminRoutes = new Hono<HonoEnv>();
adminRoutes.use('*', adminAuth());

adminRoutes.get('/users', AdminHandler.getUsers);
adminRoutes.get('/users/:id', AdminHandler.getUser);
adminRoutes.patch('/users/:id', AdminHandler.updateUser);
adminRoutes.post('/users/:id/password', AdminHandler.forceResetPassword);
adminRoutes.delete('/users/:id/2fa', AdminHandler.disable2FA);
adminRoutes.delete('/users/:id', AdminHandler.deleteUser);

adminRoutes.delete('/users/:id/sessions', AdminHandler.revokeSessions);
adminRoutes.post('/users/:id/lock', AdminHandler.lockAccount);

app.route('/admin', adminRoutes);

export default {
	fetch: app.fetch,

	// Cloudflare Cron Trigger Handler
	async scheduled(controller: ScheduledController, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
		const logger = new Logger(env.LOG_LEVEL || 'info');
		logger.info(`[CRON] Event triggered: ${controller.cron}`);

		const auditLogRepo = new AuditLogRepository(env.DB);

		const retentionDays = parseInt(env.AUDIT_LOG_RETENTION_DAYS || '30', 10) || 30;

		ctx.waitUntil(
			(async () => {
				const deletedCount = await auditLogRepo.prune(retentionDays);
				logger.info(`[CRON] Pruned ${deletedCount} audit logs older than 30 days.`);
			})(),
		);
	},

	// Cloudflare Queue Consumer Handler
	async queue(batch: MessageBatch<EmailQueueMessage>, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
		const logger = new Logger(env.LOG_LEVEL || 'info');
		logger.info(`[QUEUE] Processing batch of ${batch.messages.length} messages`);

		const emailService = new EmailService(env.APP_NAME, env.BASE_URL, env.RESEND_API_KEY, env.RESEND_DOMAIN);

		for (const message of batch.messages) {
			try {
				await emailService.processMessage(message.body);
				message.ack();
			} catch (error) {
				logger.error(`[QUEUE] Failed to process message ${message.id}`, error);
				message.retry();
			}
		}
	},
};
