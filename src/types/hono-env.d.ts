import { AuthService } from '../services/auth.service';

export type HonoEnv = {
	Bindings: Env & {
		APP_NAME: string;
		LOG_LEVEL?: string;
		BASE_URL: string;
		COOKIE_DOMAIN: string;
		AUTH_LIMITER: RateLimit;
		RESEND_API_KEY: string;
		RESEND_DOMAIN: string;
		GITHUB_CLIENT_ID: string;
		GITHUB_CLIENT_SECRET: string;
	};
	Variables: {
		authService: AuthService;
		csrfToken: string;
		logger: Logger;
	};
};
