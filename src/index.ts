import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { html } from 'hono/html';
import { layout } from './views/components/layout';
import { AuthHandler } from './handlers/auth.handler';
import { InternalHandler } from './handlers/internal.handler';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';
import { TokenRepository } from './repositories/token.repository';
import { EmailService } from './services/email.service';
import { AuthService } from './services/auth.service';
import { HonoEnv } from './types/hono-env';
import { csrfOnGet, csrfOnPost } from './middleware/csrf.middleware';
import { rateLimit } from './middleware/rate-limit.middleware';
import { adminAuth } from './middleware/admin-auth.middleware';
import { AdminHandler } from './handlers/admin.handler';
import { Logger } from './utils/logger';

const app = new Hono<HonoEnv>();

app.use('*', secureHeaders());

app.get('/favicon.ico', (c) => {
	// 204 means "Success, but there is no content to return"
	// The browser will fall back to using the <link rel="icon"> in the HTML head.
	return c.body(null, 204);
});

app.use('*', async (c, next) => {
	const logger = new Logger(c.env.LOG_LEVEL || 'info');
	c.set('logger', logger);

	const userRepo = new UserRepository(c.env.DB);
	const sessionRepo = new SessionRepository(c.env.KV);
	const tokenRepo = new TokenRepository(c.env.KV);

	const emailService = new EmailService(c.env.RESEND_API_KEY, c.env.RESEND_DOMAIN, c.env.BASE_URL);

	const authService = new AuthService(userRepo, sessionRepo, tokenRepo, emailService);
	c.set('authService', authService);

	await next();
});

app.notFound((c) => {
	return c.html(layout('Page Not Found', html`<p class="subtitle">The page you are looking for does not exist.</p>`), 404);
});

app.onError((err, c) => {
	console.error(err);
	return c.html(layout('Internal Error', html`<div class="error">Something went wrong. Please try again later.</div>`), 500);
});

app.get('/', csrfOnGet(), AuthHandler.index);
app.get('/login', csrfOnGet(), AuthHandler.renderLogin);
app.get('/register', csrfOnGet(), AuthHandler.renderRegister);

// Rate Limited Routes
app.post('/login', rateLimit(), csrfOnPost(), AuthHandler.handleLogin);
app.post('/register', rateLimit(), csrfOnPost(), AuthHandler.handleRegister);
app.post('/logout', rateLimit(), csrfOnPost(), AuthHandler.handleLogout);

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

// Magic Link Routes
app.get('/magic-link', csrfOnGet(), AuthHandler.renderMagicLink);
app.post('/magic-link', rateLimit(), csrfOnPost(), AuthHandler.handleMagicLinkRequest);
app.get('/verify-magic-link', csrfOnGet(), AuthHandler.handleVerifyMagicLink);

// Admin Routes
app.get('/admin', adminAuth(), AdminHandler.renderDashboard);

export default app;
