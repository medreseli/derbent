import { Context } from 'hono';
import { CookieOptions } from 'hono/utils/cookie';
import { HonoEnv } from '../types/hono-env';

export function getCookieOptions(c: Context<HonoEnv>) {
	const config = c.get('config');
	const isProd = config.APP_ENV === 'production';

	const options: CookieOptions = {
		path: '/',
		httpOnly: true,
		sameSite: 'Lax',
		secure: isProd,
	};

	if (isProd && config.COOKIE_DOMAIN) {
		options.domain = config.COOKIE_DOMAIN;
	}

	return options;
}
