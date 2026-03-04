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

function getClientInfo(c: Context) {
	return {
		ip: c.req.header('cf-connecting-ip') || 'unknown',
		userAgent: c.req.header('user-agent') || 'unknown',
	};
}

export class AuthHandler {
	static async index(c: Context<HonoEnv>) {
		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		const { ip, userAgent } = getClientInfo(c);

		let session = null;

		for (const app of ALLOWED_APPS) {
			const sessionId = getCookie(c, `session_${app}`);
			if (sessionId) {
				try {
					session = await authService.verifySession(sessionId, app, ip, userAgent);
					break;
				} catch (err) {
					// Cookie exists but is invalid/expired. Ignore and check the next app.
				}
			}
		}

		return c.html(landingPage(c.env.APP_NAME, csrfToken, session));
	}

	static async renderLogin(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		const githubClientId = c.env.GITHUB_CLIENT_ID;
		const errorParam = c.req.query('error');
		const errorMsg = errorParam === 'github_failed' ? 'GitHub authentication failed. Please try again.' : undefined;

		return c.html(loginPage(c.env.APP_NAME, appId, redirect, csrfToken, errorMsg, undefined, githubClientId));
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
		const logger = c.get('logger');
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		const formData = await c.req.parseBody();
		const result = v.safeParse(LoginSchema, formData);

		if (!result.success) {
			logger.warn(`Login validation failed for app: ${appId}`, result.issues);
			return c.html(loginPage(appId, redirect, c.get('csrfToken'), result.issues[0].message), 400);
		}

		try {
			const { sessionId, app } = await authService.login(
				result.output.email as string,
				result.output.password as string,
				appId,
				ip,
				userAgent,
			);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400; // 24 hours

			setCookie(c, `session_${app}`, sessionId, cookieOpts);
			logger.info(`Successful login. Setting Cookie "session_${app}"`, { email: result.output.email });

			deleteCookie(c, 'csrf_token', getCookieOptions(c));

			return c.redirect(redirect);
		} catch (err) {
			logger.error(`Login error for ${result.output.email}`, err);

			if (err instanceof AppError && err.message === 'EMAIL_NOT_VERIFIED') {
				// Pass IP/UA to requestNewVerification
				await authService.requestNewVerification(result.output.email as string, appId, ip, userAgent);
				return c.redirect(`/verify-pending?app_id=${appId}`);
			}
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			const status = err instanceof AppError ? err.status : 500;

			return c.html(loginPage(appId, redirect, c.get('csrfToken'), msg), status);
		}
	}

	static async handleRegister(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		const formData = await c.req.parseBody();
		const result = v.safeParse(RegisterSchema, formData);

		if (!result.success) {
			console.error(`[REGISTER VALIDATION ERROR]`, result.issues);
			return c.html(registerPage(appId, redirect, c.get('csrfToken'), result.issues[0].message), 400);
		}

		try {
			// Pass IP/UA
			await authService.register(result.output.email as string, result.output.password as string, appId, ip, userAgent);
			return c.redirect(`/verify-pending?app_id=${appId}`);
		} catch (err) {
			console.error(`[REGISTER ERROR]`, err);

			let status: ContentfulStatusCode = 500;
			let msg = 'An unexpected system error occurred. Please try again later.';

			if (err instanceof AppError) {
				msg = err.message;
				status = err.status;
			}

			return c.html(registerPage(appId, redirect, c.get('csrfToken'), msg), status);
		}
	}

	static async handleVerifyEmail(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		const { ip, userAgent } = getClientInfo(c);

		if (!token) {
			return c.html(loginPage('sso', '/', c.get('csrfToken'), 'No verification token provided.'));
		}

		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		try {
			// Pass IP/UA
			await authService.verifyEmailToken(token, ip, userAgent);
			return c.html(loginPage(c.env.APP_NAME, 'sso', '/', csrfToken, undefined, 'Email verified successfully! You can now log in.'));
		} catch (err) {
			console.error(`[VERIFY EMAIL ERROR]`, err);
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			const status = err instanceof AppError ? err.status : 500;
			return c.html(loginPage('sso', '/', csrfToken, msg), status);
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

	static async handleLogoutAll(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		let sessionId = getCookie(c, `session_${appId}`);
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (sessionId) {
			try {
				const session = await authService.verifySession(sessionId, appId);
				await authService.logoutAll(session.userId, ip, userAgent);
			} catch (err) {
				console.error(`[LOGOUT ALL ERROR]`, err);
			}
		}

		const cookieOptions = getCookieOptions(c);
		deleteCookie(c, 'csrf_token', getCookieOptions(c));
		deleteCookie(c, `session_${appId}`, cookieOptions);
		if (appId !== 'sso') {
			deleteCookie(c, 'session_sso', cookieOptions);
		}

		return c.redirect(redirect);
	}

	static async handleLogoutAllByEmail(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		let sessionId = getCookie(c, `session_${appId}`);
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (sessionId) {
			try {
				const session = await authService.verifySession(sessionId, appId);
				await authService.logoutAllByEmail(session.email, ip, userAgent);
			} catch (err) {
				console.error(`[LOGOUT ALL ERROR]`, err);
			}
		}

		const cookieOptions = getCookieOptions(c);
		deleteCookie(c, `session_${appId}`, cookieOptions);
		if (appId !== 'sso') deleteCookie(c, 'session_sso', cookieOptions);

		return c.redirect(redirect);
	}

	static async renderForgot(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.html(forgotPasswordPage(csrfToken, appId, redirect));
	}

	static async handleForgot(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const { ip, userAgent } = getClientInfo(c);
		const { appId, redirect } = getParams(c);
		const result = v.safeParse(ForgotPasswordSchema, formData);

		if (result.success) {
			try {
				// Pass IP/UA
				await c.get('authService').requestPasswordReset(result.output.email, appId, ip, userAgent);
			} catch (err) {
				console.error(`[FORGOT PASSWORD ERROR]`, err);
			}
		} else {
			console.error(`[FORGOT PASSWORD VALIDATION ERROR]`, result.issues);
		}
		const csrfToken = c.get('csrfToken');
		return c.html(forgotPasswordPage(csrfToken, appId, redirect, undefined, true));
	}

	static async renderReset(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		if (!token) return c.redirect('/login');
		const csrfToken = c.get('csrfToken');
		return c.html(resetPasswordPage(token, csrfToken));
	}

	static async handleReset(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const { ip, userAgent } = getClientInfo(c);
		const result = v.safeParse(ResetPasswordSchema, formData);
		const token = (formData.token as string) || '';
		const csrfToken = c.get('csrfToken');

		if (!result.success) {
			console.error(`[RESET VALIDATION ERROR]`, result.issues);
			return c.html(resetPasswordPage(token, csrfToken, result.issues[0].message), 400);
		}

		try {
			// Pass IP/UA
			const app = await c.get('authService').resetPassword(result.output.token, result.output.password, ip, userAgent);
			return c.html(loginPage(c.env.APP_NAME, app, '/', csrfToken, undefined, 'Password reset successful! You can now log in.'));
		} catch (err) {
			console.error(`[RESET ERROR]`, err);
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			const status = err instanceof AppError ? err.status : 500;
			return c.html(resetPasswordPage(result.output.token, csrfToken, msg), status);
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
		const { ip, userAgent } = getClientInfo(c);

		const formData = await c.req.parseBody();
		const result = v.safeParse(MagicLinkSchema, formData);

		if (!result.success) {
			console.error(`[MAGIC LINK REQUEST VALIDATION ERROR]`, result.issues);
			return c.html(magicLinkPage(appId, redirect, csrfToken, result.issues[0].message), 400);
		}

		try {
			// Pass IP/UA
			await c.get('authService').requestMagicLink(result.output.email, appId, redirect, ip, userAgent);
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
		const { ip, userAgent } = getClientInfo(c);

		if (!token) {
			return c.html(loginPage(appId, redirect, csrfToken, 'No magic link token provided.'));
		}

		try {
			const { sessionId, app } = await authService.verifyMagicLink(token, appId, ip, userAgent);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;

			setCookie(c, `session_${app}`, sessionId, cookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			console.error(`[VERIFY MAGIC LINK ERROR]`, err);
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			const status = err instanceof AppError ? err.status : 500;
			return c.html(loginPage(appId, redirect, csrfToken, msg), status);
		}
	}

	static async handleGitHubLogin(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const state = btoa(JSON.stringify({ appId, redirect }));
		const githubUrl = `https://github.com/login/oauth/authorize?client_id=${c.env.GITHUB_CLIENT_ID}&scope=user:email&state=${state}`;
		return c.redirect(githubUrl);
	}

	static async handleGitHubCallback(c: Context<HonoEnv>) {
		const code = c.req.query('code');
		const state = c.req.query('state');
		const { ip, userAgent } = getClientInfo(c);
		const authService = c.get('authService');

		let appId = 'sso';
		let redirect = '/';
		if (state) {
			try {
				const parsed = JSON.parse(atob(state));
				appId = parsed.appId || 'sso';
				redirect = parsed.redirect || '/';
			} catch (e) {}
		}

		if (!code || !state) return c.redirect(`/login?app_id=${appId}&redirect=${encodeURIComponent(redirect)}`);

		try {
			// 1. Exchange Code for Token
			const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
				body: JSON.stringify({
					client_id: c.env.GITHUB_CLIENT_ID,
					client_secret: c.env.GITHUB_CLIENT_SECRET,
					code,
				}),
			});
			const tokenData: any = await tokenRes.json();
			if (!tokenData.access_token) throw new Error('GitHub Auth Failed');

			// 2. Get User Email
			const emailRes = await fetch('https://api.github.com/user/emails', {
				headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Derbent-Auth' },
			});
			const emails: any[] = await emailRes.json();
			const primaryEmail = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email;

			if (!primaryEmail) throw new Error('No verified email found on GitHub');

			// 3. Complete Login
			const { sessionId, app } = await authService.loginWithOAuth(primaryEmail, 'github', appId, ip, userAgent);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;
			setCookie(c, `session_${app}`, sessionId, cookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			console.error('[GitHub Callback Error]', err);
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'github_failed' }).toString();
			return c.redirect(`/login?${qs}`);
		}
	}
}
