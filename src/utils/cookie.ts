import { Context } from 'hono';
import { CookieOptions } from 'hono/utils/cookie';

export function getCookieOptions(c: Context) {
	const options: CookieOptions = {
		path: '/',
		httpOnly: true,
		sameSite: 'Lax',
		domain: c.env.COOKIE_DOMAIN,
		secure: c.env.APP_ENV === 'production',
	};

	return options;
}
