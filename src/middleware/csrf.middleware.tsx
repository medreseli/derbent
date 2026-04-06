import { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HonoEnv } from '../types/hono-env';
import { getCookieOptions } from '../utils/cookie';

export const csrfOnGet = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		let csrfToken = getCookie(c, 'csrf_token');

		if (!csrfToken) {
			csrfToken = crypto.randomUUID();
			const cookieOptions = getCookieOptions(c);
			cookieOptions.maxAge = 86400; // 24 hours
			setCookie(c, 'csrf_token', csrfToken, cookieOptions);
		}

		c.set('csrfToken', csrfToken);
		await next();
	};
};

export const csrfOnPost = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		const logger = c.get('logger');
		const csrfTokenFromCookies = getCookie(c, 'csrf_token');

		const formData = await c.req.parseBody();
		const csrfTokenFromForm = formData['csrf_token'];

		if (!csrfTokenFromCookies || !csrfTokenFromForm || csrfTokenFromCookies !== csrfTokenFromForm) {
			logger.error(`[CSRF ERROR] Validation failed on ${c.req.path}`);
			logger.error(`  - Cookie Token: ${csrfTokenFromCookies || 'MISSING'}`);
			logger.error(`  - Form Token:   ${csrfTokenFromForm || 'MISSING'}`);

			c.status(403);
			return c.render(
				<div className="text-center">
					<h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-4">Forbidden</h2>
					<p className="text-sm text-zinc-600">Security token mismatch. Please go back, refresh the page, and try again.</p>
				</div>,
			);
		}

		c.set('csrfToken', csrfTokenFromCookies);
		await next();
	};
};
