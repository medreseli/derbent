import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

/**
 * Integration Test Suite for Derbent
 * Covers the full lifecycle from Registration to Session Revocation.
 */
describe('Derbent Integration', () => {
	const TEST_UA = 'Derbent-Test-Agent';

	const getCookie = (res: Response, name: string) => {
		const setCookie = res.headers.get('set-cookie');
		if (!setCookie) return null;
		const cookies = setCookie.split(/,(?=[^;]+=[^;]+;)/).map((c) => c.trim());
		const target = cookies.find((c) => c.startsWith(`${name}=`));
		return target ? target.split('=')[1].split(';')[0] : null;
	};

	const getCsrfAndCookie = async () => {
		const res = await app.fetch(
			new Request('http://localhost/login', {
				headers: { 'User-Agent': TEST_UA },
			}),
			env,
		);
		const token = getCookie(res, 'csrf_token');
		return { token, cookie: `csrf_token=${token}` };
	};

	it('Full Lifecycle: Register -> Verify -> Login -> Verify Session', async () => {
		const email = 'newuser@zerdalu.com';
		const password = 'Password123!';
		const { token, cookie } = await getCsrfAndCookie();

		// 1. REGISTER
		await app.fetch(
			new Request('http://localhost/register?app_id=sso', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie, 'User-Agent': TEST_UA },
				body: new URLSearchParams({ email, password, confirmPassword: password, csrf_token: token! }),
			}),
			env,
		);

		const kvList = await env.KV.list({ prefix: 'verify_email:' });
		const verificationToken = kvList.keys[0].name.split(':')[1];

		// 2. VERIFY
		await app.fetch(
			new Request(`http://localhost/verify-email?token=${verificationToken}`, {
				headers: { 'User-Agent': TEST_UA },
			}),
			env,
		);

		// 3. LOGIN
		const loginRes = await app.fetch(
			new Request('http://localhost/login?app_id=sso', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie, 'User-Agent': TEST_UA },
				body: new URLSearchParams({ email, password, csrf_token: token! }),
			}),
			env,
		);

		const sessionSso = getCookie(loginRes, 'session_sso');

		// 4. INTERNAL VERIFY
		const verifySessionRes = await app.fetch(
			new Request('http://localhost/internal/verify?app_id=sso', {
				headers: {
					Cookie: `session_sso=${sessionSso}`,
					'User-Agent': TEST_UA, // Consistent UA
				},
			}),
			env,
		);

		expect(verifySessionRes.status).toBe(200);
		const sessionData = (await verifySessionRes.json()) as any;
		expect(sessionData.email).toBe(email);
	});

	it('Security: Should prevent session usage if User-Agent changes (Hijacking)', async () => {
		const sessionId = 'fake-session-id';
		const userId = 'user-123';

		// Manually inject a session into KV with a specific User-Agent
		await env.KV.put(
			sessionId,
			JSON.stringify({
				userId,
				email: 'target@zerdalu.com',
				role: 'user',
				appId: 'sso',
				createdAt: Date.now(),
				ip: '1.1.1.1',
				userAgent: 'Legit-Browser-v1',
				tokenVersion: 1,
				data: {},
			}),
		);

		// Attempt to verify with a DIFFERENT User-Agent
		const res = await app.fetch(
			new Request('http://localhost/internal/verify?app_id=sso', {
				headers: {
					Cookie: `session_sso=${sessionId}`,
					'User-Agent': 'Evil-Hacker-Tool',
				},
			}),
			env,
		);

		expect(res.status).toBe(401);
		expect(await res.text()).toContain('Client Mismatch');
	});

	it('Security: Should block requests after "Logout All" (Token Versioning)', async () => {
		const sessionId = 'active-session-id';
		const userId = 'user-revoked';

		// 1. Setup user in D1 with version 2
		await env.DB.prepare(
			"INSERT INTO users (id, app, email, phash, email_verified, token_version) VALUES (?, 'sso', 'revoked@zerdalu.com', 'hash', 1, 2)",
		)
			.bind(userId)
			.run();

		// 2. Setup session in KV with version 1 (outdated)
		await env.KV.put(
			sessionId,
			JSON.stringify({
				userId,
				email: 'revoked@zerdalu.com',
				appId: 'sso',
				tokenVersion: 1,
				userAgent: 'Any-UA',
				ip: '1.1.1.1',
				createdAt: Date.now(),
				data: {},
			}),
		);

		// Update KV version cache to 2
		await env.KV.put(`user_ver:${userId}`, '2');

		// 3. Attempt to use session
		const res = await app.fetch(
			new Request('http://localhost/internal/verify?app_id=sso', {
				headers: {
					Cookie: `session_sso=${sessionId}`,
					'User-Agent': 'Any-UA',
				},
			}),
			env,
		);

		expect(res.status).toBe(401);
		expect(await res.text()).toContain('Revoked');
	});

	it('Brute Force: Should increment login attempts in KV', async () => {
		const email = 'victim@zerdalu.com';
		const { token, cookie } = await getCsrfAndCookie();

		// Perform 1 failed login
		await app.fetch(
			new Request('http://localhost/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
				body: new URLSearchParams({ email, password: 'wrong-password', csrf_token: token! }),
			}),
			env,
		);

		// Check if logic-level rate limit KV is updated
		const attempts = await env.KV.get(`login_attempt:${email}`);

		// Ensure attempts is not null and is a valid number
		const attemptsCount = attempts ? parseInt(attempts, 10) : 0;
		expect(attemptsCount).toBeGreaterThan(0);
	});
});
