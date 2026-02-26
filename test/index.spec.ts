import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Derbent Auth Worker', () => {
	it('responds with landing page on /', async () => {
		const request = new IncomingRequest('http://derbent.zerdalu.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		const html = await response.text();
		expect(html).toContain('A derbent was a fortified pass');
	});

	it('responds with 404 on unhandled paths', async () => {
		const request = new IncomingRequest('http://derbent.zerdalu.com/not-a-real-path');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(404);
	});

	it('responds with 401 on /verify without provided cookies', async () => {
		const request = new IncomingRequest('http://derbent.zerdalu.com/verify?app_id=sso');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(401);
	});

	it('renders login HTML on GET /login', async () => {
		const request = new IncomingRequest('http://derbent.zerdalu.com/login?app_id=sso');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toContain('text/html');
	});
});
