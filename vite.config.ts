import { defineConfig } from 'vite';
import devServer from '@hono/vite-dev-server';
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare';
import build from '@hono/vite-build';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';

// Custom plugin to treat SVG as raw strings in Vite
const svgRawPlugin = {
	name: 'svg-raw',
	enforce: 'pre' as const, // Run before Vite's internal asset loader
	load(id: string) {
		if (id.endsWith('.svg')) {
			const filePath = id.split('?')[0]; // Remove query params
			const content = fs.readFileSync(filePath, 'utf-8');
			return `export default ${JSON.stringify(content)}`;
		}
	},
};

export default defineConfig({
	server: {
		port: 7777,
	},
	plugins: [
		svgRawPlugin,
		tailwindcss(),
		devServer({
			entry: 'src/index.tsx',
			adapter: cloudflareAdapter,
		}),
		build({
			entry: 'src/index.tsx',
		}),
	],
});
