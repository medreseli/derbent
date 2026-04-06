import { defineConfig } from 'vite';
import devServer from '@hono/vite-dev-server';
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare';
import build from '@hono/vite-build';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [
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
