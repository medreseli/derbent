import { MiddlewareHandler } from 'hono';
import { HonoEnv } from '../types/hono-env';

export const adminAuth = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		const secret = c.env.ADMIN_SECRET;

		if (!secret) {
			const logger = c.get('logger');
			logger.error('[ADMIN API] Missing ADMIN_SECRET in environment variables.');
			return c.json({ error: 'Admin API is not configured on this instance.' }, 500);
		}

		const authHeader = c.req.header('Authorization');
		if (authHeader !== `Bearer ${secret}`) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		await next();
	};
};
