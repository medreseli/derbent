import { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HonoEnv } from '../types/hono-env';
import { layout } from '../views/components/layout';
import { html } from 'hono/html';

export const csrfOnGet = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		let csrfToken = getCookie(c, `csrf_token`);
		if (!csrfToken) csrfToken = crypto.randomUUID();

		c.set('csrfToken', csrfToken);
		await next();

		const cookieOptions: any = {
			path: '/',
			httpOnly: true,
			sameSite: 'Lax',
			maxAge: 86400,
		};

		const isProduction = c.env.NIYET === 'yayma';
		if (isProduction) {
			cookieOptions.domain = '.zerdalu.com';
			cookieOptions.secure = true;
		}

		setCookie(c, `csrf_token`, csrfToken, cookieOptions);
	};
};

export const csrfOnPost = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		let csrfToken = getCookie(c, `csrf_token`);

		const formData = await c.req.parseBody();
		const csrfTokenFromForm = formData['csrf_token'];

		if (!csrfToken || !csrfTokenFromForm || csrfToken !== csrfTokenFromForm) {
			console.error(`[CSRF ERROR] Failed validation on ${c.req.path}`);
			console.error(`  - Cookie Token: ${csrfToken}`);
			console.error(`  - Form Token:   ${csrfTokenFromForm}`);

			return c.html(layout('Forbidden', html` <p class="lead">You can not complete this action.</p> `), 403);
		}

		c.set('csrfToken', csrfToken);
		await next();
	};
};
