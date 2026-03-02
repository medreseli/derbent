import { MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HonoEnv } from '../types/hono-env';
import { layout } from '../views/components/layout';
import { html } from 'hono/html';
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

			return c.html(
				layout('Forbidden', html`<p class="lead">Security token mismatch. Please go back, refresh the page, and try again.</p>`),
				403,
			);
		}

		c.set('csrfToken', csrfTokenFromCookies);
		await next();
	};
};
