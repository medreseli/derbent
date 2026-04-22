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
import { configMiddleware } from './middleware/config.middleware';
import { AdminHandler } from './handlers/admin.handler';
import { AdminService } from './services/admin.service';
import { AppRepository } from './repositories/app.repository';
import { SettingsRepository } from './repositories/settings.repository';

const app = new Hono<HonoEnv>();

app.use('*', secureHeaders());
app.use('*', renderer);

// 1. Inject the Config Middleware early so other services can consume it
app.use('*', configMiddleware());

// 2. Initialize Services
app.use('*', async (c, next) => {
	const config = c.get('config');

	const logger = new Logger(config.LOG_LEVEL || 'info');
	c.set('logger', logger);

	const userRepo = new UserRepository(c.env.DB);
	const sessionRepo = new SessionRepository(c.env.KV);
	const tokenRepo = new TokenRepository(c.env.KV);
	const userTokenVersionRepo = new UserTokenVersionRepository(c.env.KV);
	const auditLogRepo = new AuditLogRepository(c.env.DB);
	const loginAttemptRepo = new LoginAttemptRepository(c.env.KV);
	const settingsRepo = new SettingsRepository(c.env.DB, c.env.KV);

	const appRepo = new AppRepository(c.env.DB);
	c.set('appRepo', appRepo);

	const isDev = config.APP_ENV === 'development';

	const activeQueue = isDev ? undefined : c.env.EMAIL_QUEUE;
	const emailService = new EmailService(
		isDev,
		config.APP_NAME,
		config.BASE_URL,
		config.RESEND_API_KEY || '',
		config.RESEND_DOMAIN || '',
		activeQueue,
	);

	const hashIterations = parseInt(config.PBKDF2_ITERATIONS || '100000', 10);

	const authService = new AuthService(
		userRepo,
		sessionRepo,
		tokenRepo,
		userTokenVersionRepo,
		appRepo,
		emailService,
		auditLogRepo,
		loginAttemptRepo,
		hashIterations,
	);
	c.set('authService', authService);

	const adminService = new AdminService(userRepo, auditLogRepo, userTokenVersionRepo, appRepo, settingsRepo, hashIterations);
	c.set('adminService', adminService);

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
app.get('/auth/google', AuthHandler.handleGoogleLogin);
app.get('/auth/google/callback', AuthHandler.handleGoogleCallback);

// Admin Dashboard Routes
const adminRoutes = new Hono<HonoEnv>();
adminRoutes.use('*', adminAuth());

adminRoutes.get('/stats', AdminHandler.getStats);

adminRoutes.get('/settings', AdminHandler.getSettings);
adminRoutes.patch('/settings', AdminHandler.updateSettings);

adminRoutes.get('/apps', AdminHandler.getApps);
adminRoutes.get('/apps/:id', AdminHandler.getApp);
adminRoutes.post('/apps', AdminHandler.createApp);
adminRoutes.patch('/apps/:id', AdminHandler.updateApp);
adminRoutes.delete('/apps/:id', AdminHandler.deleteApp);

adminRoutes.get('/users', AdminHandler.getUsers);
adminRoutes.get('/users/:id', AdminHandler.getUser);
adminRoutes.patch('/users/:id', AdminHandler.updateUser);
adminRoutes.post('/users/:id/password', AdminHandler.forceResetPassword);
adminRoutes.delete('/users/:id/2fa', AdminHandler.disable2FA);
adminRoutes.delete('/users/:id', AdminHandler.deleteUser);

adminRoutes.delete('/users/:id/sessions', AdminHandler.revokeSessions);
adminRoutes.post('/users/:id/lock', AdminHandler.lockAccount);

adminRoutes.get('/audit-logs', AdminHandler.getAuditLogs);
adminRoutes.get('/users/:id/audit-logs', AdminHandler.getUserAuditLogs);

app.route('/admin', adminRoutes);

export default {
	fetch: app.fetch,

	// Cloudflare Cron Trigger Handler
	async scheduled(controller: ScheduledController, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
		let retentionDays = parseInt(env.AUDIT_LOG_RETENTION_DAYS || '30', 10);
		let logLevel = env.LOG_LEVEL || 'info';

		if (env.USE_DYNAMIC_CONFIG === 'true' && env.DERBENT_API_KEY) {
			const settingsRepo = new SettingsRepository(env.DB, env.KV);
			const dynamic = await settingsRepo.getCachedConfig(env.DERBENT_API_KEY);
			if (dynamic) {
				if (dynamic.AUDIT_LOG_RETENTION_DAYS) retentionDays = parseInt(dynamic.AUDIT_LOG_RETENTION_DAYS, 10);
				if (dynamic.LOG_LEVEL) logLevel = dynamic.LOG_LEVEL;
			}
		}

		const logger = new Logger(logLevel);
		logger.info(`[CRON] Event triggered: ${controller.cron}`);

		const auditLogRepo = new AuditLogRepository(env.DB);

		ctx.waitUntil(
			(async () => {
				const deletedCount = await auditLogRepo.prune(retentionDays);
				logger.info(`[CRON] Pruned ${deletedCount} audit logs older than ${retentionDays} days.`);
			})(),
		);
	},

	// Cloudflare Queue Consumer Handler
	async queue(batch: MessageBatch<EmailQueueMessage>, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
		let appName = env.APP_NAME || 'Derbent';
		let baseUrl = env.BASE_URL;
		let resendApi = env.RESEND_API_KEY || '';
		let resendDomain = env.RESEND_DOMAIN || '';
		let logLevel = env.LOG_LEVEL || 'info';
		let appEnv = env.APP_ENV || 'production';

		if (env.USE_DYNAMIC_CONFIG === 'true' && env.DERBENT_API_KEY) {
			const settingsRepo = new SettingsRepository(env.DB, env.KV);
			const dynamic = await settingsRepo.getCachedConfig(env.DERBENT_API_KEY);
			if (dynamic) {
				if (dynamic.APP_NAME) appName = dynamic.APP_NAME;
				if (dynamic.BASE_URL) baseUrl = dynamic.BASE_URL;
				if (dynamic.RESEND_API_KEY) resendApi = dynamic.RESEND_API_KEY;
				if (dynamic.RESEND_DOMAIN) resendDomain = dynamic.RESEND_DOMAIN;
				if (dynamic.LOG_LEVEL) logLevel = dynamic.LOG_LEVEL;
				if (dynamic.APP_ENV) appEnv = dynamic.APP_ENV;
			}
		}

		const logger = new Logger(logLevel);
		logger.info(`[QUEUE] Processing batch of ${batch.messages.length} messages`);

		const isDev = appEnv === 'development';
		const emailService = new EmailService(isDev, appName, baseUrl, resendApi, resendDomain);

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
