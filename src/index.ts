import { createSetCookieHeader, parseCookie } from './lib/cookie';
import { verifyPassword, hashPassword } from './lib/crypto';
import { getLoginUser, getUserByEmailAndApp, hasAnyAppAccount, createUser } from './lib/db';
import { landingPage, loginPage, registerPage } from './lib/html';
import { createSession, deleteSession, getSession } from './lib/session';
import { LoginSchema, QuerySchema, RegisterSchema } from './lib/validation';
import { Session } from './types/session';

import * as v from 'valibot';

function getParams(url: URL) {
	const parsed = v.safeParse(QuerySchema, {
		app_id: url.searchParams.get('app_id') || undefined,
		redirect: url.searchParams.get('redirect') || undefined,
	});

	if (parsed.success) {
		return { redirect: parsed.output.redirect, appId: parsed.output.app_id };
	}

	return { redirect: '/', appId: 'sso' };
}

function htmlResponse(html: string, status = 200) {
	return new Response(html, {
		status,
		headers: { 'Content-Type': 'text/html; charset=utf-8' },
	});
}

function redirectResponse(url: string, headers?: HeadersInit) {
	return new Response(null, {
		status: 302,
		headers: {
			Location: url,
			...headers,
		},
	});
}

async function handleIndex() {
	return htmlResponse(landingPage());
}

async function handleLoginGet(request: Request) {
	const url = new URL(request.url);
	const { redirect, appId } = getParams(url);
	return htmlResponse(loginPage(appId, redirect));
}

async function handleLoginPost(request: Request, env: Env) {
	const url = new URL(request.url);
	const { redirect, appId } = getParams(url);

	const formData = await request.formData().catch(() => new FormData());
	const data = Object.fromEntries(formData.entries());

	const parsed = v.safeParse(LoginSchema, data);
	if (!parsed.success) {
		const errorMessage = parsed.issues[0].message;
		return htmlResponse(loginPage(appId, redirect, errorMessage), 400);
	}

	const { email, password } = parsed.output;

	const user = await getLoginUser(env, email, appId);
	if (!user) {
		return htmlResponse(loginPage(appId, redirect, 'Invalid email or password'), 401);
	}

	const isValid = await verifyPassword(password, user.phash);
	if (!isValid) {
		return htmlResponse(loginPage(appId, redirect, 'Invalid email or password'), 401);
	}

	const session: Session = {
		userId: user.id,
		email: user.email,
		role: 'user',
		appId: user.app,
		createdAt: Date.now(),
	};

	const sessionId = await createSession(env, session);
	const setCookie = createSetCookieHeader(user.app, sessionId);

	return redirectResponse(redirect, { 'Set-Cookie': setCookie });
}

async function handleRegisterGet(request: Request) {
	const url = new URL(request.url);
	const { redirect, appId } = getParams(url);
	return htmlResponse(registerPage(appId, redirect));
}

async function handleRegisterPost(request: Request, env: Env) {
	const url = new URL(request.url);
	const { redirect, appId } = getParams(url);

	const formData = await request.formData().catch(() => new FormData());
	const data = Object.fromEntries(formData.entries());

	const parsed = v.safeParse(RegisterSchema, data);
	if (!parsed.success) {
		const errorMessage = parsed.issues[0].message;
		return htmlResponse(registerPage(appId, redirect, errorMessage), 400);
	}

	const { email, password } = parsed.output;

	// 1. SSO Priority Check
	const ssoUser = await getUserByEmailAndApp(env, email, 'sso');
	if (ssoUser) {
		return htmlResponse(registerPage(appId, redirect, 'An SSO account already exists for this email.'), 400);
	}

	// 2 & 3. App Isolation and Upgrade Restrictions
	if (appId !== 'sso') {
		const appUser = await getUserByEmailAndApp(env, email, appId);
		if (appUser) {
			return htmlResponse(registerPage(appId, redirect, 'Account already exists for this app.'), 400);
		}
	} else {
		const hasAppAccount = await hasAnyAppAccount(env, email);
		if (hasAppAccount) {
			return htmlResponse(registerPage(appId, redirect, 'An app-level account already exists for this email.'), 400);
		}
	}

	const phash = await hashPassword(password);
	const userId = crypto.randomUUID();

	await createUser(env, userId, appId, email, phash);

	const session: Session = {
		userId,
		email,
		role: 'user',
		appId,
		createdAt: Date.now(),
	};

	const sessionId = await createSession(env, session);
	const setCookie = createSetCookieHeader(appId, sessionId);

	return redirectResponse(redirect, { 'Set-Cookie': setCookie });
}

async function handleLogout(request: Request, env: Env) {
	const url = new URL(request.url);
	const { redirect, appId } = getParams(url);
	const cookieHeader = request.headers.get('Cookie');

	let sessionId = parseCookie(cookieHeader, appId);
	if (!sessionId && appId !== 'sso') {
		sessionId = parseCookie(cookieHeader, 'sso');
	}

	if (sessionId) {
		await deleteSession(env, sessionId);
	}

	const headers = new Headers();
	headers.append('Location', redirect);
	headers.append('Set-Cookie', `session_${appId}=; Domain=.zerdalu.com; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
	if (appId !== 'sso') {
		headers.append('Set-Cookie', `session_sso=; Domain=.zerdalu.com; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
	}

	return new Response(null, { status: 302, headers });
}

async function handleVerify(request: Request, env: Env) {
	const url = new URL(request.url);
	const appId = url.searchParams.get('app_id');

	if (!appId) {
		return new Response('Missing app_id', { status: 400 });
	}

	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) {
		return new Response('Unauthorized', { status: 401 });
	}

	let sessionId = parseCookie(cookieHeader, appId);

	// Gracefully fallback to an SSO session cookie if available
	if (!sessionId && appId !== 'sso') {
		sessionId = parseCookie(cookieHeader, 'sso');
	}

	if (!sessionId) {
		return new Response('Unauthorized', { status: 401 });
	}

	const session = await getSession(env, sessionId);
	if (!session) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (session.appId !== appId && session.appId !== 'sso') {
		return new Response('Forbidden', { status: 403 });
	}

	return new Response(JSON.stringify(session), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method;

		try {
			if (path === '/' && method === 'GET') return await handleIndex();
			if (path === '/login' && method === 'GET') return await handleLoginGet(request);
			if (path === '/login' && method === 'POST') return await handleLoginPost(request, env);
			if (path === '/register' && method === 'GET') return await handleRegisterGet(request);
			if (path === '/register' && method === 'POST') return await handleRegisterPost(request, env);
			if (path === '/logout' && method === 'GET') return await handleLogout(request, env);
			if (path === '/verify' && method === 'GET') return await handleVerify(request, env);

			return new Response('Not found', { status: 404 });
		} catch (error: any) {
			console.error('Unhandled request error:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
