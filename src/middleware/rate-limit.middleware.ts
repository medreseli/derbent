import { MiddlewareHandler } from 'hono';
import { HonoEnv } from '../types/hono-env';
import { layout } from '../views/components/layout';
import { html } from 'hono/html';

export const rateLimit = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		const ip = c.req.header('cf-connecting-ip') || 'global';

		// The key can be anything; here we limit by IP
		const { success } = await c.env.AUTH_LIMITER.limit({ key: ip });

		if (!success) {
			console.warn(`Rate limit exceeded for IP: ${ip}`);
			return c.html(
				layout(
					'Too Many Requests',
					html`
						<p class="lead">You've made too many attempts in a short period.</p>
						<p class="subtitle">Please wait a minute and try again.</p>
					`,
				),
				429,
			);
		}

		await next();
	};
};
