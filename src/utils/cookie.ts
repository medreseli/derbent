import { Context } from 'hono';
import { CookieOptions } from 'hono/utils/cookie';
import { HonoEnv } from '../types/hono-env';

export function getCookieOptions(c: Context<HonoEnv>) {
	const isProd = c.env.APP_ENV === 'production';

	const options: CookieOptions = {
		path: '/',
		httpOnly: true,
		sameSite: 'Lax',
		secure: isProd,
	};

	if (isProd && c.env.COOKIE_DOMAIN) {
		options.domain = c.env.COOKIE_DOMAIN;
	}

	return options;
}
