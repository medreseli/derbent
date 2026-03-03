import { env } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('Security & Logic Integration', () => {
	const TEST_UA = 'Derbent-Test-Agent';

	const getCsrfAndCookie = async () => {
		const res = await app.fetch(new Request('http://localhost/login'), env);
		const setCookie = res.headers.get('set-cookie') || '';
		const match = setCookie.match(/csrf_token=([^;]+)/);
		const token = match ? match[1] : '';
		return { token, cookie: `csrf_token=${token}` };
	};

	it('CSRF: should block POST requests without a valid CSRF token', async () => {
		const res = await app.fetch(
			new Request('http://localhost/login', {
				method: 'POST',
				body: new URLSearchParams({ email: 'test@example.com', password: 'password123' }),
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			}),
			env,
		);
		expect(res.status).toBe(403);
	});

	it('Session Hijacking: should reject session if User-Agent changes', async () => {
		const sessionId = 'hijack-test-id';
		await env.KV.put(
			sessionId,
			JSON.stringify({
				userId: 'u1',
				email: 't@z.com',
				appId: 'sso',
				role: 'user',
				tokenVersion: 1,
				userAgent: 'OriginalUA',
				ip: '1.1.1.1',
				createdAt: Date.now(),
				data: {},
			}),
		);

		const res = await app.fetch(
			new Request('http://localhost/internal/verify?app_id=sso', {
				headers: { Cookie: `session_sso=${sessionId}`, 'User-Agent': 'EvilUA' },
			}),
			env,
		);
		expect(res.status).toBe(401);
	});

	it('Logout All: should invalidate all sessions by incrementing version', async () => {
		const userId = 'user-ver-1';
		const sessionId = 'sess-ver-1';

		await env.DB.prepare("INSERT INTO users (id, app, email, phash, email_verified, token_version) VALUES (?, 'sso', 'v@t.com', 'h', 1, 1)")
			.bind(userId)
			.run();
		await env.KV.put(
			sessionId,
			JSON.stringify({
				userId,
				email: 'v@t.com',
				appId: 'sso',
				role: 'user',
				tokenVersion: 1,
				userAgent: TEST_UA,
				ip: '1.1.1.1',
				createdAt: Date.now(),
				data: {},
			}),
		);

		await env.DB.prepare('UPDATE users SET token_version = 2 WHERE id = ?').bind(userId).run();
		await env.KV.put(`user_ver:${userId}`, '2');

		const res = await app.fetch(
			new Request('http://localhost/internal/verify?app_id=sso', {
				headers: { Cookie: `session_sso=${sessionId}`, 'User-Agent': TEST_UA },
			}),
			env,
		);
		expect(res.status).toBe(401);
	});

	it('Brute Force: should lock account after 5 failed attempts', async () => {
		const email = 'brute@example.com';
		const { token, cookie } = await getCsrfAndCookie();

		await env.KV.put(`login_attempt:${email}`, '5');

		const res = await app.fetch(
			new Request('http://localhost/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Cookie: cookie,
					'User-Agent': TEST_UA, // Add UA
				},
				// Password must be >= 8 chars to pass validation and hit the rate limiter
				body: new URLSearchParams({ email, password: 'password-is-wrong', csrf_token: token! }),
			}),
			env,
		);
		expect(res.status).toBe(429);
	});
});
