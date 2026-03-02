import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import * as v from 'valibot';
import { AppError } from '../types/errors';
import { HonoEnv } from '../types/hono-env';
import {
	ForgotPasswordSchema,
	LoginSchema,
	QuerySchema,
	RegisterSchema,
	ResetPasswordSchema,
	MagicLinkSchema,
	ALLOWED_APPS,
} from '../utils/validation';
import { getCookieOptions } from '../utils/cookie';
import { landingPage } from '../views/pages/landing';
import { loginPage } from '../views/pages/login';
import { registerPage } from '../views/pages/register';
import { verifyPendingPage } from '../views/pages/verify-pending';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { forgotPasswordPage } from '../views/pages/forgot-password';
import { resetPasswordPage } from '../views/pages/reset-password';
import { magicLinkPage } from '../views/pages/magic-link';

function getParams(c: Context) {
	const parsed = v.safeParse(QuerySchema, {
		app_id: c.req.query('app_id'),
		redirect: c.req.query('redirect'),
	});
	return parsed.success ? { redirect: parsed.output.redirect, appId: parsed.output.app_id } : { redirect: '/', appId: 'sso' };
}

export class AuthHandler {
	static async index(c: Context<HonoEnv>) {
		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');

		let session = null;
		let isAdmin = false;

		for (const app of ALLOWED_APPS) {
			const sessionId = getCookie(c, `session_${app}`);
			if (sessionId) {
				try {
					session = await authService.verifySession(sessionId, app);
					isAdmin = session.email === c.env.ADMIN_EMAIL;
					break;
				} catch (err) {
					// Cookie exists but is invalid/expired. Ignore and check the next app.
				}
			}
		}

		return c.html(landingPage(csrfToken, session, isAdmin));
	}

	static async renderLogin(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.html(loginPage(appId, redirect, csrfToken));
	}

	static async renderRegister(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.html(registerPage(appId, redirect, csrfToken));
	}

	static async renderVerifyPending(c: Context<HonoEnv>) {
		const { appId } = getParams(c);
		return c.html(verifyPendingPage(appId));
	}

	static async handleLogin(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const logger = c.get('logger');

		const formData = await c.req.parseBody();
		const result = v.safeParse(LoginSchema, formData);

		if (!result.success) {
			logger.warn(`Login validation failed for app: ${appId}`, result.issues);
			return c.html(loginPage(appId, redirect, c.get('csrfToken'), result.issues[0].message), 400);
		}

		try {
			const { sessionId, app } = await authService.login(result.output.email as string, result.output.password as string, appId);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400; // 24 hours

			setCookie(c, `session_${app}`, sessionId, cookieOpts);
			logger.info(`Successful login. Setting Cookie "session_${app}"`, { email: result.output.email });

			deleteCookie(c, 'csrf_token', getCookieOptions(c));

			return c.redirect(redirect);
		} catch (err) {
			logger.error(`Login error for ${result.output.email}`, err);

			if (err instanceof AppError && err.message === 'EMAIL_NOT_VERIFIED') {
				await authService.requestNewVerification(result.output.email as string, appId);
				return c.redirect(`/verify-pending?app_id=${appId}`);
			}
			const msg = err instanceof AppError ? err.message : 'Login failed';
			return c.html(loginPage(appId, redirect, c.get('csrfToken'), msg), 401);
		}
	}

	static async handleRegister(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');

		const formData = await c.req.parseBody();
		const result = v.safeParse(RegisterSchema, formData);

		if (!result.success) {
			console.error(`[REGISTER VALIDATION ERROR]`, result.issues);
			return c.html(registerPage(appId, redirect, c.get('csrfToken'), result.issues[0].message), 400);
		}

		try {
			await authService.register(result.output.email as string, result.output.password as string, appId);
			return c.redirect(`/verify-pending?app_id=${appId}`);
		} catch (err) {
			console.error(`[REGISTER ERROR]`, err);

			let status: ContentfulStatusCode = 500;
			let msg = 'Registration failed';

			if (err instanceof AppError) {
				msg = err.message;
				status = err.status;
			}

			return c.html(registerPage(appId, redirect, c.get('csrfToken'), msg), status);
		}
	}

	static async handleVerifyEmail(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		if (!token) {
			return c.html(loginPage('sso', '/', c.get('csrfToken'), 'No verification token provided.'));
		}

		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		try {
			await authService.verifyEmailToken(token);
			return c.html(loginPage('sso', '/', csrfToken, undefined, 'Email verified successfully! You can now log in.'));
		} catch (err) {
			console.error(`[VERIFY EMAIL ERROR]`, err);
			const msg = err instanceof AppError ? err.message : 'Verification failed.';
			return c.html(loginPage('sso', '/', csrfToken, msg), 400);
		}
	}

	static async handleLogout(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const cookieOptions = getCookieOptions(c);

		let sessionId = getCookie(c, `session_${appId}`);
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (sessionId) {
			try {
				await authService.logout(sessionId);
			} catch (err) {
				console.error(`[LOGOUT ERROR]`, err);
			}
		}

		deleteCookie(c, 'csrf_token', getCookieOptions(c));
		deleteCookie(c, `session_${appId}`, cookieOptions);
		if (appId !== 'sso') {
			deleteCookie(c, 'session_sso', cookieOptions);
		}

		return c.redirect(redirect);
	}

	static async renderForgot(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		return c.html(forgotPasswordPage(csrfToken));
	}

	static async handleForgot(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const result = v.safeParse(ForgotPasswordSchema, formData);
		if (result.success) {
			try {
				await c.get('authService').requestPasswordReset(result.output.email);
			} catch (err) {
				console.error(`[FORGOT PASSWORD ERROR]`, err);
			}
		} else {
			console.error(`[FORGOT PASSWORD VALIDATION ERROR]`, result.issues);
		}
		const csrfToken = c.get('csrfToken');
		return c.html(forgotPasswordPage(csrfToken, undefined, true));
	}

	static async renderReset(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		if (!token) return c.redirect('/login');
		const csrfToken = c.get('csrfToken');
		return c.html(resetPasswordPage(token, csrfToken));
	}

	static async handleReset(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const result = v.safeParse(ResetPasswordSchema, formData);
		const token = (formData.token as string) || '';
		const csrfToken = c.get('csrfToken');

		if (!result.success) {
			console.error(`[RESET VALIDATION ERROR]`, result.issues);
			return c.html(resetPasswordPage(token, csrfToken, result.issues[0].message), 400);
		}

		try {
			await c.get('authService').resetPassword(result.output.token, result.output.password);
			return c.html(loginPage('sso', '/', csrfToken, undefined, 'Password reset successful! You can now log in.'));
		} catch (err) {
			console.error(`[RESET ERROR]`, err);
			const msg = err instanceof Error ? err.message : 'Reset failed';
			return c.html(resetPasswordPage(result.output.token, csrfToken, msg), 400);
		}
	}

	static async renderMagicLink(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.html(magicLinkPage(appId, redirect, csrfToken));
	}

	static async handleMagicLinkRequest(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const csrfToken = c.get('csrfToken');

		const formData = await c.req.parseBody();
		const result = v.safeParse(MagicLinkSchema, formData);

		if (!result.success) {
			console.error(`[MAGIC LINK REQUEST VALIDATION ERROR]`, result.issues);
			return c.html(magicLinkPage(appId, redirect, csrfToken, result.issues[0].message), 400);
		}

		try {
			await c.get('authService').requestMagicLink(result.output.email, appId, redirect);
		} catch (err) {
			console.error(`[MAGIC LINK REQUEST ERROR]`, err);
		}

		return c.html(magicLinkPage(appId, redirect, csrfToken, undefined, true));
	}

	static async handleVerifyMagicLink(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');

		if (!token) {
			return c.html(loginPage(appId, redirect, csrfToken, 'No magic link token provided.'));
		}

		try {
			const { sessionId, app } = await authService.verifyMagicLink(token, appId);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;

			setCookie(c, `session_${app}`, sessionId, cookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			console.error(`[VERIFY MAGIC LINK ERROR]`, err);
			const msg = err instanceof AppError ? err.message : 'Magic link sign-in failed.';
			return c.html(loginPage(appId, redirect, csrfToken, msg), 401);
		}
	}
}
