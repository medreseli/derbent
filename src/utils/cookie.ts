import { Context } from 'hono';
import { CookieOptions } from 'hono/utils/cookie';

export function getCookieOptions(c: Context) {
	const url = new URL(c.req.url);

	const options: CookieOptions = {
		path: '/',
		httpOnly: true,
		sameSite: 'Lax',
	};

	const isProduction = c.env.NIYET === 'yayma';
	if (isProduction) {
		options.domain = '.zerdalu.com';
		options.secure = true;
	}

	return options;
}
