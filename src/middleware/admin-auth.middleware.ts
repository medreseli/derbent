import { MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { HonoEnv } from '../types/hono-env';

export const adminAuth = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		const adminEmail = c.env.ADMIN_EMAIL;

		if (!adminEmail) {
			return c.text('Admin access is not configured on this environment.', 500);
		}

		// Fallback to reading both sso and app specific cookies just in case
		let sessionId = getCookie(c, 'session_sso') || getCookie(c, 'session_derbent');

		if (!sessionId) {
			return c.redirect('/login?app_id=sso&redirect=/admin');
		}

		try {
			const authService = c.get('authService');
			// We verify against 'sso' to ensure global auth level
			const session = await authService.verifySession(sessionId, 'sso');

			if (session.email !== adminEmail) {
				return c.text('Forbidden: You do not have admin privileges.', 403);
			}

			// Passed validation, proceed to admin routes
			await next();
		} catch (err) {
			// Session invalid or expired
			return c.redirect('/login?app_id=sso&redirect=/admin');
		}
	};
};
