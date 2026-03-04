import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { AppError } from '../types/errors';
import { HonoEnv } from '../types/hono-env';

export class InternalHandler {
	static async verify(c: Context<HonoEnv>) {
		const appId = c.req.query('app_id');
		if (!appId) return c.text('Missing app_id', 400);

		// Prioritize explicit Derbent headers (from Service Bindings), fallback to direct request headers.
		// We default IP to 127.0.0.1 for local dev/testing environments.
		const clientIp = c.req.header('Derbent-Client-IP') || c.req.header('cf-connecting-ip') || '127.0.0.1';
		const clientUA = c.req.header('Derbent-Client-UA') || c.req.header('user-agent');

		// Strictly require the User-Agent context for session hijacking protection
		if (!clientUA) {
			const logger = c.get('logger');
			logger.warn(`[Internal Verifier] Rejected request for app '${appId}' due to missing Client UA context.`);
			c.header('Cache-Control', 'no-store');
			return c.text('Bad Request: Missing Derbent-Client-UA or User-Agent header', 400);
		}

		const authService = c.get('authService');

		let sessionId = getCookie(c, `session_${appId}`);
		// Fallback to SSO cookie if app specific not found
		if (!sessionId && appId !== 'sso') sessionId = getCookie(c, 'session_sso');

		if (!sessionId) {
			c.header('Cache-Control', 'no-store');
			return c.text('Unauthorized', 401);
		}

		try {
			const session = await authService.verifySession(sessionId, appId, clientIp, clientUA);

			// Cache verification result for 1 minute to reduce D1/KV load from frequent internal requests
			c.header('Cache-Control', 'private, max-age=60');
			c.header('Vary', 'Cookie'); // Ensure different sessions aren't cached together

			return c.json(session);
		} catch (err) {
			c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.text(msg, status);
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
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.text(msg, status);
		}
	}
}
