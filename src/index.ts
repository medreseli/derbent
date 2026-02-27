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

const app = new Hono<HonoEnv>();

app.use('*', secureHeaders());

app.use('*', async (c, next) => {
	const userRepo = new UserRepository(c.env.DB);
	const sessionRepo = new SessionRepository(c.env.KV);
	const tokenRepo = new TokenRepository(c.env.KV);
	const emailService = new EmailService(c.env.RESEND_API_KEY);

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

app.get('/verify', InternalHandler.verify);

app.get('/', AuthHandler.index);
app.get('/login', AuthHandler.renderLogin);
app.post('/login', AuthHandler.handleLogin);
app.get('/register', AuthHandler.renderRegister);
app.post('/register', AuthHandler.handleRegister);
app.get('/logout', AuthHandler.handleLogout);

// Email Verification Routes
app.get('/verify-pending', AuthHandler.renderVerifyPending);
app.get('/verify-email', AuthHandler.handleVerifyEmail);

export default app;
