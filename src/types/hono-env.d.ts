import { AuthService } from '../services/auth.service';

export type HonoEnv = {
	Bindings: Env & {
		RESEND_API_KEY?: string;
	};
	Variables: {
		authService: AuthService;
	};
};
