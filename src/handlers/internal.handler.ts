import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { AppError } from '../types/errors';
import { HonoEnv } from '../types/hono-env';

export class InternalHandler {
	static async verify(c: Context<HonoEnv>) {
		const appId = c.req.query('app_id');
		if (!appId) return c.text('Missing app_id', 400);

		// When called via Service Binding, the calling worker (Geveze) MUST pass the end-user's details in these headers.
		// If they are missing, we default to 'internal-request' or similar, but this weakens security.
		const clientIp = c.req.header('Derbent-Client-IP') || c.req.header('cf-connecting-ip') || 'unknown';
		const clientUA = c.req.header('Derbent-Client-UA') || c.req.header('user-agent') || 'unknown';

		const authService = c.get('authService');

		let sessionId = getCookie(c, `session_${appId}`);
		// Fallback to SSO cookie if app specific not found
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (!sessionId) return c.text('Unauthorized', 401);

		try {
			const session = await authService.verifySession(sessionId, appId, clientIp, clientUA);
			return c.json(session);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			return c.text(err instanceof Error ? err.message : 'Error', status);
		}
	}

	static async logout(c: Context<HonoEnv>) {
		const appId = c.req.query('app_id');
		if (!appId) return c.text('Missing app_id', 400);

		const authService = c.get('authService');

		let sessionId = getCookie(c, `session_${appId}`);
		// Fallback to SSO cookie if app specific not found
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (!sessionId) return c.text('Unauthorized', 401);

		try {
			await authService.logout(sessionId);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			return c.text(err instanceof Error ? err.message : 'Error', status);
		}
	}
}
