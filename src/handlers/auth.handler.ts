import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import * as v from 'valibot';
import { AppError } from '../types/errors';
import { HonoEnv } from '../types/hono-env';
import { ForgotPasswordSchema, LoginSchema, QuerySchema, RegisterSchema, ResetPasswordSchema } from '../utils/validation';
import { landingPage } from '../views/pages/landing';
import { loginPage } from '../views/pages/login';
import { registerPage } from '../views/pages/register';
import { verifyPendingPage } from '../views/pages/verify-pending';
import { ContentfulStatusCode } from 'hono/utils/http-status';
import { forgotPasswordPage } from '../views/pages/forgot-password';
import { resetPasswordPage } from '../views/pages/reset-password';

function getParams(c: Context) {
	const parsed = v.safeParse(QuerySchema, {
		app_id: c.req.query('app_id'),
		redirect: c.req.query('redirect'),
	});
	return parsed.success ? { redirect: parsed.output.redirect, appId: parsed.output.app_id } : { redirect: '/', appId: 'sso' };
}

export class AuthHandler {
	static async index(c: Context<HonoEnv>) {
		return c.html(landingPage());
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

		const formData = await c.req.parseBody();
		const result = v.safeParse(LoginSchema, formData);

		if (!result.success) {
			return c.html(loginPage(appId, redirect, result.issues[0].message), 400);
		}

		try {
			const { sessionId, app } = await authService.login(result.output.email as string, result.output.password as string, appId);

			setCookie(c, `session_${app}`, sessionId, {
				domain: '.zerdalu.com',
				path: '/',
				secure: true,
				httpOnly: true,
				sameSite: 'Lax',
				maxAge: 86400,
			});

			return c.redirect(redirect);
		} catch (err) {
			if (err instanceof AppError && err.message === 'EMAIL_NOT_VERIFIED') {
				// Prevent lockouts: Automatically fire a fresh verification email.
				await authService.requestNewVerification(result.output.email as string, appId);
				return c.redirect(`/verify-pending?app_id=${appId}`);
			}
			const msg = err instanceof AppError ? err.message : 'Login failed';
			return c.html(loginPage(appId, redirect, msg), 401);
		}
	}

	static async handleRegister(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');

		const formData = await c.req.parseBody();
		const result = v.safeParse(RegisterSchema, formData);

		if (!result.success) {
			return c.html(registerPage(appId, redirect, result.issues[0].message), 400);
		}

		try {
			await authService.register(result.output.email as string, result.output.password as string, appId);
			return c.redirect(`/verify-pending?app_id=${appId}`);
		} catch (err) {
			let status: ContentfulStatusCode = 500;
			let msg = 'Registration failed';

			if (err instanceof AppError) {
				msg = err.message;
				status = err.status;
			}

			return c.html(registerPage(appId, redirect, msg), status);
		}
	}

	static async handleVerifyEmail(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		if (!token) {
			return c.html(loginPage('sso', '/', 'No verification token provided.'));
		}

		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		try {
			await authService.verifyEmailToken(token);
			return c.html(loginPage('sso', '/', csrfToken, undefined, 'Email verified successfully! You can now log in.'));
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'Verification failed.';
			return c.html(loginPage('sso', '/', msg));
		}
	}

	static async handleLogout(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');

		let sessionId = getCookie(c, `session_${appId}`);
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (sessionId) await authService.logout(sessionId);

		deleteCookie(c, `session_${appId}`, { domain: '.zerdalu.com', path: '/' });
		if (appId !== 'sso') {
			deleteCookie(c, 'session_sso', { domain: '.zerdalu.com', path: '/' });
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
			await c.get('authService').requestPasswordReset(result.output.email);
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
			return c.html(resetPasswordPage(token, result.issues[0].message), 400);
		}

		try {
			await c.get('authService').resetPassword(result.output.token, result.output.password);
			return c.html(loginPage('sso', '/', csrfToken, undefined, 'Password reset successful! You can now log in.'));
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Reset failed';
			return c.html(resetPasswordPage(result.output.token, msg), 400);
		}
	}
}
