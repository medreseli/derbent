import { MiddlewareHandler } from 'hono';
import { SettingsRepository } from '../repositories/settings.repository';
import { DerbentConfig } from '../types/config';
import { HonoEnv } from '../types/hono-env';

export const configMiddleware = (): MiddlewareHandler<HonoEnv> => {
	return async (c, next) => {
		// 1. Base Configuration (from Cloudflare Environment Variables)
		const baseConfig: DerbentConfig = {
			APP_ENV: c.env.APP_ENV || 'production',
			LOG_LEVEL: c.env.LOG_LEVEL || 'info',
			APP_NAME: c.env.APP_NAME || 'Derbent',
			BASE_URL: c.env.BASE_URL,
			COOKIE_DOMAIN: c.env.COOKIE_DOMAIN,
			RESEND_DOMAIN: c.env.RESEND_DOMAIN,
			RESEND_API_KEY: c.env.RESEND_API_KEY,
			GITHUB_CLIENT_ID: c.env.GITHUB_CLIENT_ID,
			GITHUB_CLIENT_SECRET: c.env.GITHUB_CLIENT_SECRET,
			GOOGLE_CLIENT_ID: c.env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: c.env.GOOGLE_CLIENT_SECRET,
			PBKDF2_ITERATIONS: c.env.PBKDF2_ITERATIONS || '100000',
			AUDIT_LOG_RETENTION_DAYS: c.env.AUDIT_LOG_RETENTION_DAYS || '30',
		};

		// 2. If dynamic config is turned off, skip DB/KV checks to save latency
		if (c.env.USE_DYNAMIC_CONFIG !== 'true') {
			c.set('config', baseConfig);
			return await next();
		}

		// 3. We require DERBENT_API_KEY to act as the encryption key for KV
		const masterKey = c.env.DERBENT_API_KEY;
		if (!masterKey) {
			console.warn('[Config] USE_DYNAMIC_CONFIG is enabled, but DERBENT_API_KEY is missing. Falling back to static env vars.');
			c.set('config', baseConfig);
			return await next();
		}

		const settingsRepo = new SettingsRepository(c.env.DB, c.env.KV);
		let dynamicConfig = await settingsRepo.getCachedConfig(masterKey);

		// 4. Cache miss: Fetch from D1, encrypt it, and save to KV
		if (!dynamicConfig) {
			dynamicConfig = await settingsRepo.buildAndCacheConfig(masterKey);
		}

		// 5. Merge: Dynamic configs overwrite base configs, but we ignore empty/null dynamic values
		const finalConfig: DerbentConfig = { ...baseConfig };
		for (const [key, value] of Object.entries(dynamicConfig)) {
			if (value !== null && value !== undefined && value.trim() !== '') {
				(finalConfig as any)[key] = value;
			}
		}

		c.set('config', finalConfig);
		await next();
	};
};
