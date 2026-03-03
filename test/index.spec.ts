import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../src/index';

const createRequest = (url: string, method: string = 'GET', body?: any) => {
	return new Request(url, {
		method,
		headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
		body: body ? new URLSearchParams(body).toString() : undefined,
	});
};

describe('Derbent Auth Worker', () => {
	it('responds with landing page on /', async () => {
		const request = createRequest('http://localhost/');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
	});

	it('responds with 404 on unhandled paths', async () => {
		const request = createRequest('http://localhost/not-a-real-path');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it('responds with 401 on /internal/verify without provided cookies', async () => {
		// FIXED PATH: was /verify, now /internal/verify
		const request = createRequest('http://localhost/internal/verify?app_id=sso');
		const ctx = createExecutionContext();
		const response = await app.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
	});
});
