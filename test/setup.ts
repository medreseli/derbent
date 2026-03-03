import { env } from 'cloudflare:test';
import { beforeAll } from 'vitest';
// @ts-ignore
import schemaRaw from '../db/schema.sql?raw';

beforeAll(async () => {
	// 1. Remove SQL comments (single line -- and multi-line /* */)
	const cleanSql = schemaRaw
		.replace(/--.*$/gm, '') // Remove -- comments
		.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove /* */ comments

	// 2. Split by semicolon
	const statements = cleanSql
		.split(';')
		.map((s: string) => s.trim())
		.filter((s: string) => s.length > 0);

	// 3. Execute one by one using .run() to avoid the .exec() metadata bug
	for (const statement of statements) {
		try {
			await env.DB.prepare(statement).run();
		} catch (e) {
			console.error('D1 Setup Error at statement:', statement);
			console.error(e);
			throw e;
		}
	}
});
