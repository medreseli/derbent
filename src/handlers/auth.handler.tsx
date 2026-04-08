import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import * as v from 'valibot';
import { AppId, REGISTERED_APPS } from '../config/apps';
import { AppError } from '../types/errors';
import { HonoEnv } from '../types/hono-env';
import { Session } from '../types/session';
import { getCookieOptions } from '../utils/cookie';
import { generateSecret } from '../utils/totp';
import {
	ChangePasswordSchema,
	ForgotPasswordSchema,
	LoginSchema,
	MagicLinkSchema,
	QuerySchema,
	RegisterSchema,
	ResetPasswordSchema,
} from '../utils/validation';

import { ChangePasswordPage } from '../ui/pages/change-password';
import { ForgotPasswordPage } from '../ui/pages/forgot-password';
import { AppStatus, LandingPage } from '../ui/pages/landing';
import { LoginPage } from '../ui/pages/login';
import { MagicLinkPage } from '../ui/pages/magic-link';
import { RegisterPage } from '../ui/pages/register';
import { ResetPasswordPage } from '../ui/pages/reset-password';
import { TwoFactorManagePage, TwoFactorSetupPage } from '../ui/pages/two-factor';
import { TwoFactorVerifyPage } from '../ui/pages/two-factor-verify';
import { VerifyPendingPage } from '../ui/pages/verify-pending';

function getParams(c: Context): { redirect: string; appId: AppId } {
	const parsed = v.safeParse(QuerySchema, {
		app_id: c.req.query('app_id'),
		redirect: c.req.query('redirect'),
	});

	if (parsed.success) {
		return {
			appId: parsed.output.app_id as AppId,
			redirect: parsed.output.redirect ?? '/',
		};
	}

	return { redirect: '/', appId: 'sso' };
}

function getClientInfo(c: Context) {
	return {
		ip: c.req.header('cf-connecting-ip') || 'unknown',
		userAgent: c.req.header('user-agent') || 'unknown',
	};
}

export class AuthHandler {
	/**
	 * Resolves conflicting session states depending on the app being logged into.
	 */
	static async clearConflictingSessions(c: Context<HonoEnv>, newlyLoggedInApp: string) {
		const authService = c.get('authService');
		const cookieOpts = getCookieOptions(c);

		if (newlyLoggedInApp === 'sso') {
			// 1. If logging into global SSO: Wipe all individual app sessions (hodan, namedar, etc.)
			for (const appKey of Object.keys(REGISTERED_APPS)) {
				if (appKey === 'sso') continue;

				const cookieName = `session_${appKey}`;
				const existingSessionId = getCookie(c, cookieName);

				if (existingSessionId) {
					try {
						await authService.logout(existingSessionId);
					} catch (e) {}
					deleteCookie(c, cookieName, cookieOpts);
				}
			}
		} else {
			// 2. If logging into a specific app (e.g., 'hodan'):
			// Wipe the global SSO session to prevent ambiguity, but LEAVE 'namedar' alone.
			const ssoSessionId = getCookie(c, 'session_sso');
			if (ssoSessionId) {
				try {
					await authService.logout(ssoSessionId);
				} catch (e) {}
				deleteCookie(c, 'session_sso', cookieOpts);
			}

			// 3. Clean up the old session for this specific app if it already exists (preventing orphan KV records).
			const currentAppSessionId = getCookie(c, `session_${newlyLoggedInApp}`);
			if (currentAppSessionId) {
				try {
					await authService.logout(currentAppSessionId);
				} catch (e) {}
				// We don't need to delete the cookie here because the handler will immediately overwrite it.
			}
		}
	}

	static async getActiveSession(c: Context<HonoEnv>): Promise<{ session: Session; appId: string } | null> {
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		const explicitAppId = c.req.query('app_id') as AppId | undefined;

		// If an explicit app_id is passed, prioritize checking it first
		let appsToCheck = Object.keys(REGISTERED_APPS);
		if (explicitAppId && REGISTERED_APPS[explicitAppId]) {
			appsToCheck = [explicitAppId, ...appsToCheck.filter((id) => id !== explicitAppId)];
		}

		for (const appKey of appsToCheck) {
			const cookieName = `session_${appKey}`;
			const cookieVal = getCookie(c, cookieName);

			if (cookieVal) {
				try {
					const session = await authService.verifySession(cookieVal, appKey, ip, userAgent);
					return { session, appId: appKey };
				} catch (e) {
					// continue checking others
				}
			}
		}
		return null;
	}

	static async index(c: Context<HonoEnv>) {
		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		const { ip, userAgent } = getClientInfo(c);

		const appStatuses: AppStatus[] = [];
		let hasAnySession = false;

		for (const [appId, appConfig] of Object.entries(REGISTERED_APPS)) {
			let sessionId = getCookie(c, `session_${appId}`);
			let isSsoFallback = false;

			if (!sessionId && appId !== 'sso') {
				sessionId = getCookie(c, 'session_sso');
				isSsoFallback = !!sessionId;
			}

			let session = null;
			if (sessionId) {
				try {
					session = await authService.verifySession(sessionId, appId, ip, userAgent);
					hasAnySession = true;
				} catch (err) {
					isSsoFallback = false;
				}
			}

			const appUrl = c.env.APP_ENV === 'development' ? appConfig.devUrl : appConfig.prodUrl;

			appStatuses.push({
				config: {
					id: appConfig.id,
					name: appConfig.name,
					description: appConfig.description,
					icon: appConfig.icon,
					url: appUrl,
				},
				session,
				isSsoFallback,
			});
		}

		const successParam = c.req.query('success');
		let successMsg = undefined;
		if (successParam === '2fa_enabled') successMsg = 'Two-Factor Authentication was successfully enabled.';
		if (successParam === '2fa_disabled') successMsg = 'Two-Factor Authentication was successfully disabled.';

		return c.render(<LandingPage csrfToken={csrfToken} apps={appStatuses} hasAnySession={hasAnySession} successMsg={successMsg} />);
	}

	static async renderLogin(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		const githubClientId = c.env.GITHUB_CLIENT_ID;
		const googleClientId = c.env.GOOGLE_CLIENT_ID;
		const errorParam = c.req.query('error');

		let errorMsg = undefined;
		if (errorParam === 'github_failed') errorMsg = 'GitHub authentication failed. Please try again.';
		if (errorParam === 'github_not_configured') errorMsg = 'GitHub login is not enabled on this instance.';
		if (errorParam === 'google_failed') errorMsg = 'Google authentication failed. Please try again.';
		if (errorParam === 'google_not_configured') errorMsg = 'Google login is not enabled on this instance.';

		return c.render(
			<LoginPage
				appId={appId}
				redirect={redirect}
				csrfToken={csrfToken}
				error={errorMsg}
				githubClientId={githubClientId}
				googleClientId={googleClientId}
			/>,
		);
	}

	static async renderRegister(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.render(<RegisterPage appId={appId} redirect={redirect} csrfToken={csrfToken} />);
	}

	static async renderVerifyPending(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		return c.render(<VerifyPendingPage appId={appId} redirect={redirect} />);
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
			return c.render(
				<LoginPage
					appId={appId}
					redirect={redirect}
					csrfToken={c.get('csrfToken')}
					error={result.issues[0].message}
					githubClientId={c.env.GITHUB_CLIENT_ID}
					googleClientId={c.env.GOOGLE_CLIENT_ID}
				/>,
			);
		}

		try {
			const loginResult = await authService.login(result.output.email as string, result.output.password as string, appId, ip, userAgent);

			if (loginResult.requires2FA) {
				const qs = new URLSearchParams({ token: loginResult.twoFactorToken!, app_id: appId, redirect }).toString();
				return c.redirect(`/2fa/verify?${qs}`);
			}

			await AuthHandler.clearConflictingSessions(c, loginResult.app);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;

			setCookie(c, `session_${loginResult.app}`, loginResult.sessionId!, cookieOpts);
			logger.info(`Successful login. Setting Cookie "session_${loginResult.app}"`, { email: result.output.email });

			deleteCookie(c, 'csrf_token', getCookieOptions(c));

			return c.redirect(redirect);
		} catch (err) {
			logger.error(`Login error for ${result.output.email}`, err);

			if (err instanceof AppError && err.message === 'EMAIL_NOT_VERIFIED') {
				await authService.requestNewVerification(result.output.email as string, appId, redirect, ip, userAgent);
				const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
				return c.redirect(`/verify-pending?${qs}`);
			}

			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';

			return c.render(
				<LoginPage
					appId={appId}
					redirect={redirect}
					csrfToken={c.get('csrfToken')}
					error={msg}
					githubClientId={c.env.GITHUB_CLIENT_ID}
					googleClientId={c.env.GOOGLE_CLIENT_ID}
				/>,
			);
		}
	}

	static async handleRegister(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		const formData = await c.req.parseBody();
		const result = v.safeParse(RegisterSchema, formData);

		if (!result.success) {
			return c.render(<RegisterPage appId={appId} redirect={redirect} csrfToken={c.get('csrfToken')} error={result.issues[0].message} />);
		}

		try {
			await authService.register(result.output.email as string, result.output.password as string, appId, redirect, ip, userAgent);
			const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
			return c.redirect(`/verify-pending?${qs}`);
		} catch (err) {
			let msg = 'An unexpected system error occurred. Please try again later.';
			if (err instanceof AppError) msg = err.message;

			return c.render(<RegisterPage appId={appId} redirect={redirect} csrfToken={c.get('csrfToken')} error={msg} />);
		}
	}

	static async handleVerifyEmail(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		const { appId, redirect } = getParams(c);
		const { ip, userAgent } = getClientInfo(c);

		if (!token) {
			return c.render(
				<LoginPage appId={appId} redirect={redirect} csrfToken={c.get('csrfToken')} error="No verification token provided." />,
			);
		}

		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		try {
			await authService.verifyEmailToken(token, ip, userAgent);
			return c.render(
				<LoginPage appId={appId} redirect={redirect} csrfToken={csrfToken} success="Email verified successfully! You can now log in." />,
			);
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			return c.render(<LoginPage appId={appId} redirect={redirect} csrfToken={csrfToken} error={msg} />);
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
			} catch (err) {}
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
			} catch (err) {}
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
		const { redirect } = getParams(c);
		const authService = c.get('authService');
		const { ip, userAgent } = getClientInfo(c);

		let targetEmail: string | null = null;

		for (const appKey of Object.keys(REGISTERED_APPS)) {
			const cookieName = `session_${appKey}`;
			const cookieVal = getCookie(c, cookieName);

			if (cookieVal) {
				try {
					const session = await authService.verifySession(cookieVal, appKey);
					targetEmail = session.email;
					break;
				} catch (e) {}
			}
		}

		if (targetEmail) {
			try {
				await authService.logoutAllByEmail(targetEmail, ip, userAgent);
			} catch (err) {}
		}

		const cookieOptions = getCookieOptions(c);
		deleteCookie(c, 'csrf_token', getCookieOptions(c));

		for (const appKey of Object.keys(REGISTERED_APPS)) {
			deleteCookie(c, `session_${appKey}`, cookieOptions);
		}

		return c.redirect(redirect);
	}

	static async renderForgot(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.render(<ForgotPasswordPage csrfToken={csrfToken} appId={appId} redirect={redirect} />);
	}

	static async handleForgot(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const { ip, userAgent } = getClientInfo(c);
		const { appId, redirect } = getParams(c);
		const result = v.safeParse(ForgotPasswordSchema, formData);

		if (result.success) {
			try {
				await c.get('authService').requestPasswordReset(result.output.email, appId, ip, userAgent);
			} catch (err) {}
		}
		return c.render(<ForgotPasswordPage csrfToken={c.get('csrfToken')} appId={appId} redirect={redirect} success={true} />);
	}

	static async renderReset(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		if (!token) return c.redirect('/login');
		const csrfToken = c.get('csrfToken');
		return c.render(<ResetPasswordPage token={token} csrfToken={csrfToken} />);
	}

	static async handleReset(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const { ip, userAgent } = getClientInfo(c);
		const result = v.safeParse(ResetPasswordSchema, formData);
		const token = (formData.token as string) || '';
		const csrfToken = c.get('csrfToken');

		if (!result.success) {
			return c.render(<ResetPasswordPage token={token} csrfToken={csrfToken} error={result.issues[0].message} />);
		}

		try {
			const app = await c.get('authService').resetPassword(result.output.token, result.output.password, ip, userAgent);
			return c.render(
				<LoginPage appId={app} redirect="/" csrfToken={csrfToken} success="Password reset successful! You can now log in." />,
			);
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			return c.render(<ResetPasswordPage token={result.output.token} csrfToken={csrfToken} error={msg} />);
		}
	}

	static async renderChangePassword(c: Context<HonoEnv>) {
		const active = await AuthHandler.getActiveSession(c);
		if (!active) return c.redirect('/login');

		return c.render(<ChangePasswordPage csrfToken={c.get('csrfToken')} />);
	}

	static async handleChangePassword(c: Context<HonoEnv>) {
		const active = await AuthHandler.getActiveSession(c);
		if (!active) return c.redirect('/login');

		const formData = await c.req.parseBody();
		const result = v.safeParse(ChangePasswordSchema, formData);

		if (!result.success) {
			return c.render(<ChangePasswordPage csrfToken={c.get('csrfToken')} error={result.issues[0].message} />);
		}

		try {
			const { ip, userAgent } = getClientInfo(c);
			await c
				.get('authService')
				.changePassword(active.session.userId, result.output.currentPassword, result.output.newPassword, ip, userAgent);

			const cookieOptions = getCookieOptions(c);
			deleteCookie(c, 'csrf_token', cookieOptions);
			for (const appKey of Object.keys(REGISTERED_APPS)) {
				deleteCookie(c, `session_${appKey}`, cookieOptions);
			}

			return c.render(
				<LoginPage appId="sso" redirect="/" csrfToken={c.get('csrfToken')} success="Password changed successfully. Please log in again." />,
			);
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'An unexpected error occurred.';
			return c.render(<ChangePasswordPage csrfToken={c.get('csrfToken')} error={msg} />);
		}
	}

	static async renderMagicLink(c: Context<HonoEnv>) {
		const csrfToken = c.get('csrfToken');
		const { appId, redirect } = getParams(c);
		return c.render(<MagicLinkPage appId={appId} redirect={redirect} csrfToken={csrfToken} />);
	}

	static async handleMagicLinkRequest(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);
		const csrfToken = c.get('csrfToken');
		const { ip, userAgent } = getClientInfo(c);

		const formData = await c.req.parseBody();
		const result = v.safeParse(MagicLinkSchema, formData);

		if (!result.success) {
			return c.render(<MagicLinkPage appId={appId} redirect={redirect} csrfToken={csrfToken} error={result.issues[0].message} />);
		}

		try {
			await c.get('authService').requestMagicLink(result.output.email, appId, redirect, ip, userAgent);
		} catch (err) {}

		return c.render(<MagicLinkPage appId={appId} redirect={redirect} csrfToken={csrfToken} success={true} />);
	}

	static async handleVerifyMagicLink(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		const { appId, redirect } = getParams(c);
		const authService = c.get('authService');
		const csrfToken = c.get('csrfToken');
		const { ip, userAgent } = getClientInfo(c);

		if (!token) {
			return c.render(<LoginPage appId={appId} redirect={redirect} csrfToken={csrfToken} error="No magic link token provided." />);
		}

		try {
			const loginResult = await authService.verifyMagicLink(token, appId, ip, userAgent);

			if (loginResult.requires2FA) {
				const qs = new URLSearchParams({ token: loginResult.twoFactorToken!, app_id: appId, redirect }).toString();
				return c.redirect(`/2fa/verify?${qs}`);
			}

			await AuthHandler.clearConflictingSessions(c, loginResult.app);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;

			setCookie(c, `session_${loginResult.app}`, loginResult.sessionId!, cookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'An unexpected system error occurred. Please try again later.';
			return c.render(<LoginPage appId={appId} redirect={redirect} csrfToken={csrfToken} error={msg} />);
		}
	}

	static async handleGitHubLogin(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);

		if (!c.env.GITHUB_CLIENT_ID) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'github_not_configured' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		const nonce = crypto.randomUUID();
		const cookieOpts = getCookieOptions(c);
		cookieOpts.maxAge = 600;
		setCookie(c, 'github_oauth_state', nonce, cookieOpts);

		const state = btoa(JSON.stringify({ appId, redirect, nonce }));
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
		let nonceFromState = '';

		if (state) {
			try {
				const parsed = JSON.parse(atob(state));
				appId = parsed.appId || 'sso';
				redirect = parsed.redirect || '/';
				nonceFromState = parsed.nonce || '';
			} catch (e) {}
		}

		if (!c.env.GITHUB_CLIENT_ID || !c.env.GITHUB_CLIENT_SECRET) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'github_not_configured' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		if (!code || !state) return c.redirect(`/login?app_id=${appId}&redirect=${encodeURIComponent(redirect)}`);

		const storedNonce = getCookie(c, 'github_oauth_state');
		const cookieOpts = getCookieOptions(c);
		deleteCookie(c, 'github_oauth_state', cookieOpts);

		if (!storedNonce || !nonceFromState || storedNonce !== nonceFromState) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'github_failed' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		try {
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

			const emailRes = await fetch('https://api.github.com/user/emails', {
				headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'Derbent-Auth' },
			});
			const emails: any[] = await emailRes.json();
			const primaryEmail = emails.find((e) => e.primary && e.verified)?.email || emails[0]?.email;

			if (!primaryEmail) throw new Error('No verified email found on GitHub');

			const loginResult = await authService.loginWithOAuth(primaryEmail, 'github', appId, ip, userAgent);

			if (loginResult.requires2FA) {
				const qs = new URLSearchParams({ token: loginResult.twoFactorToken!, app_id: appId, redirect }).toString();
				return c.redirect(`/2fa/verify?${qs}`);
			}

			await AuthHandler.clearConflictingSessions(c, loginResult.app);

			const loginCookieOpts = getCookieOptions(c);
			loginCookieOpts.maxAge = 86400;
			setCookie(c, `session_${loginResult.app}`, loginResult.sessionId!, loginCookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'github_failed' }).toString();
			return c.redirect(`/login?${qs}`);
		}
	}

	static async handleGoogleLogin(c: Context<HonoEnv>) {
		const { appId, redirect } = getParams(c);

		if (!c.env.GOOGLE_CLIENT_ID) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'google_not_configured' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		const nonce = crypto.randomUUID();
		const cookieOpts = getCookieOptions(c);
		cookieOpts.maxAge = 600;
		setCookie(c, 'google_oauth_state', nonce, cookieOpts);

		const state = btoa(JSON.stringify({ appId, redirect, nonce }));
		const redirectUri = `${c.env.BASE_URL}/auth/google/callback`;
		const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${c.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email profile&state=${state}`;

		return c.redirect(googleUrl);
	}

	static async handleGoogleCallback(c: Context<HonoEnv>) {
		const code = c.req.query('code');
		const state = c.req.query('state');
		const { ip, userAgent } = getClientInfo(c);
		const authService = c.get('authService');

		let appId = 'sso';
		let redirect = '/';
		let nonceFromState = '';

		if (state) {
			try {
				const parsed = JSON.parse(atob(state));
				appId = parsed.appId || 'sso';
				redirect = parsed.redirect || '/';
				nonceFromState = parsed.nonce || '';
			} catch (e) {}
		}

		if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'google_not_configured' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		if (!code || !state) return c.redirect(`/login?app_id=${appId}&redirect=${encodeURIComponent(redirect)}`);

		const storedNonce = getCookie(c, 'google_oauth_state');
		const cookieOpts = getCookieOptions(c);
		deleteCookie(c, 'google_oauth_state', cookieOpts);

		if (!storedNonce || !nonceFromState || storedNonce !== nonceFromState) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'google_failed' }).toString();
			return c.redirect(`/login?${qs}`);
		}

		try {
			const redirectUri = `${c.env.BASE_URL}/auth/google/callback`;
			const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: c.env.GOOGLE_CLIENT_ID,
					client_secret: c.env.GOOGLE_CLIENT_SECRET,
					code,
					grant_type: 'authorization_code',
					redirect_uri: redirectUri,
				}).toString(),
			});

			const tokenData: any = await tokenRes.json();
			if (!tokenData.access_token) throw new Error('Google Auth Failed');

			const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
				headers: { Authorization: `Bearer ${tokenData.access_token}` },
			});
			const userData: any = await userRes.json();
			const primaryEmail = userData.email;

			if (!primaryEmail || !userData.verified_email) throw new Error('No verified email found on Google');

			const loginResult = await authService.loginWithOAuth(primaryEmail, 'google', appId, ip, userAgent);

			if (loginResult.requires2FA) {
				const qs = new URLSearchParams({ token: loginResult.twoFactorToken!, app_id: appId, redirect }).toString();
				return c.redirect(`/2fa/verify?${qs}`);
			}

			await AuthHandler.clearConflictingSessions(c, loginResult.app);

			const loginCookieOpts = getCookieOptions(c);
			loginCookieOpts.maxAge = 86400;
			setCookie(c, `session_${loginResult.app}`, loginResult.sessionId!, loginCookieOpts);

			return c.redirect(redirect);
		} catch (err) {
			const qs = new URLSearchParams({ app_id: appId, redirect, error: 'google_failed' }).toString();
			return c.redirect(`/login?${qs}`);
		}
	}

	static async render2FASetup(c: Context<HonoEnv>) {
		const active = await AuthHandler.getActiveSession(c);
		if (!active) return c.redirect('/login');

		const user = await c.get('authService').getUser(active.session.userId);
		if (!user) return c.redirect('/login');

		if (user.two_factor_enabled) {
			return c.render(<TwoFactorManagePage csrfToken={c.get('csrfToken')} isEnabled={true} />);
		}

		const secret = await generateSecret();
		await c.get('authService').saveTwoFactorSetupSecret(active.session.userId, secret);

		return c.render(<TwoFactorSetupPage csrfToken={c.get('csrfToken')} secret={secret} email={user.email} />);
	}

	static async handle2FASetup(c: Context<HonoEnv>) {
		const active = await AuthHandler.getActiveSession(c);
		if (!active) return c.redirect('/login');

		const formData = await c.req.parseBody();
		const code = formData['code'] as string;

		try {
			await c.get('authService').enableTwoFactor(active.session.userId, code);
			return c.redirect('/?success=2fa_enabled');
		} catch (err) {
			const secret = await c.get('authService').getTwoFactorSetupSecret(active.session.userId);
			const user = await c.get('authService').getUser(active.session.userId);
			const msg = err instanceof AppError ? err.message : 'Invalid code.';
			return c.render(<TwoFactorSetupPage csrfToken={c.get('csrfToken')} secret={secret || ''} email={user?.email || ''} error={msg} />);
		}
	}

	static async handle2FADisable(c: Context<HonoEnv>) {
		const active = await AuthHandler.getActiveSession(c);
		if (!active) return c.redirect('/login');

		const formData = await c.req.parseBody();
		const code = formData['code'] as string;

		try {
			await c.get('authService').disableTwoFactor(active.session.userId, code);
			return c.redirect('/?success=2fa_disabled');
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'Failed to disable 2FA.';
			return c.render(<TwoFactorManagePage csrfToken={c.get('csrfToken')} isEnabled={true} error={msg} />);
		}
	}

	static async render2FAVerify(c: Context<HonoEnv>) {
		const token = c.req.query('token');
		const { appId, redirect } = getParams(c);
		if (!token) return c.redirect(`/login?app_id=${appId}&redirect=${encodeURIComponent(redirect)}`);

		return c.render(
			<TwoFactorVerifyPage appName={c.env.APP_NAME} token={token} appId={appId} redirect={redirect} csrfToken={c.get('csrfToken')} />,
		);
	}

	static async handle2FAVerify(c: Context<HonoEnv>) {
		const formData = await c.req.parseBody();
		const token = formData['token'] as string;
		const code = formData['code'] as string;
		const { appId, redirect } = getParams(c);
		const { ip, userAgent } = getClientInfo(c);

		if (!token || !code) {
			return c.render(
				<TwoFactorVerifyPage
					appName={c.env.APP_NAME}
					token={token}
					appId={appId}
					redirect={redirect}
					csrfToken={c.get('csrfToken')}
					error="Code is required."
				/>,
			);
		}

		try {
			const result = await c.get('authService').verifyTwoFactorLogin(token, code, ip, userAgent);

			await AuthHandler.clearConflictingSessions(c, result.app);

			const cookieOpts = getCookieOptions(c);
			cookieOpts.maxAge = 86400;
			setCookie(c, `session_${result.app}`, result.sessionId!, cookieOpts);

			deleteCookie(c, 'csrf_token', getCookieOptions(c));

			return c.redirect(redirect);
		} catch (err) {
			const msg = err instanceof AppError ? err.message : 'Invalid code.';
			return c.render(
				<TwoFactorVerifyPage
					appName={c.env.APP_NAME}
					token={token}
					appId={appId}
					redirect={redirect}
					csrfToken={c.get('csrfToken')}
					error={msg}
				/>,
			);
		}
	}
}
