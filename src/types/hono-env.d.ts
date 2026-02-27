import { AuthService } from '../services/auth.service';

export type HonoEnv = {
	Bindings: Env & {
		RESEND_API_KEY?: string;
		BASE_URL?: string;
		AUTH_LIMITER: RateLimit;
	};
	Variables: {
		authService: AuthService;
	};
};
