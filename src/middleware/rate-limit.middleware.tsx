import { MiddlewareHandler } from 'hono';
import { HonoEnv } from '../types/hono-env';

export const rateLimit = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		const ip = c.req.header('cf-connecting-ip') || 'global';

		// The key can be anything; here we limit by IP
		const { success } = await c.env.AUTH_LIMITER.limit({ key: ip });

		if (!success) {
			console.warn(`Rate limit exceeded for IP: ${ip}`);

			c.status(429);
			return c.render(
				<div className="text-center">
					<h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-4">Too Many Requests</h2>
					<p className="mb-2 text-sm text-zinc-600">You've made too many attempts in a short period.</p>
					<p className="text-sm text-zinc-500">Please wait a minute and try again.</p>
				</div>,
			);
		}

		await next();
	};
};
