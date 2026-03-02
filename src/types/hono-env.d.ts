import { AuthService } from '../services/auth.service';

export type HonoEnv = {
	Bindings: Env & {
		BASE_URL?: string;
		ADMIN_EMAIL?: string;
		RESEND_API_KEY?: string;
		AUTH_LIMITER: RateLimit;
		LOG_LEVEL?: string;
	};
	Variables: {
		authService: AuthService;
		csrfToken: string;
		logger: Logger;
	};
};
