import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		cloudflareTest({
			wrangler: { configPath: './wrangler.jsonc' },
		}),
	],
});

// export default defineWorkersConfig({
// 	test: {
// 		poolOptions: {
// 			workers: {
// 				wrangler: { configPath: './wrangler.jsonc' },
// 			},
// 		},
// 		setupFiles: ['./test/setup.ts'], // This runs before test files
// 	},
// });
