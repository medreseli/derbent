import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../src/index';

// Helper to simulate IncomingRequest for Hono
const createRequest = (url: string, method: string = 'GET', body?: any) => {
	return new Request(url, {
		method,
		headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
		body: body ? new URLSearchParams(body).toString() : undefined,
	});
};

describe('Derbent Auth Worker', () => {
	it('responds with landing page on /', async () => {
		const request = createRequest('http://derbent.zerdalu.com/');
		const ctx = createExecutionContext();

		// Hono's app.fetch is compatible with the Worker signature
		const response = await app.fetch(request, env, ctx);

		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('A derbent was a fortified pass');
	});

	it('responds with 404 on unhandled paths', async () => {
		const request = createRequest('http://derbent.zerdalu.com/not-a-real-path');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it('responds with 401 on /verify without provided cookies', async () => {
		const request = createRequest('http://derbent.zerdalu.com/verify?app_id=sso');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
	});

	it('renders login HTML on GET /login', async () => {
		const request = createRequest('http://derbent.zerdalu.com/login?app_id=sso');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('text/html');
	});
});
