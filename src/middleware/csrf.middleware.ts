import { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { HonoEnv } from '../types/hono-env';
import { layout } from '../views/components/layout';
import { html } from 'hono/html';

export const csrfOnGet = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		let csrfToken = getCookie(c, `csrf_token`);
		if (!csrfToken) csrfToken = crypto.randomUUID();

		setCookie(c, `csrf_token`, csrfToken, {
			domain: '.zerdalu.com',
			path: '/',
			secure: true,
			httpOnly: true,
			sameSite: 'Lax',
			maxAge: 86400,
		});

		c.set('csrfToken', csrfToken);
		await next();
	};
};

export const csrfOnPost = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		let csrfToken = getCookie(c, `csrf_token`);

		const formData = await c.req.parseBody();
		const csrfTokenFromForm = formData['csrf_token'];

		if (!csrfToken || !csrfTokenFromForm || csrfToken !== csrfTokenFromForm) {
			return c.html(layout('Forbidden', html` <p class="lead">You can not complete this action.</p> `), 403);
		}

		c.set('csrfToken', csrfToken);
		await next();
	};
};
