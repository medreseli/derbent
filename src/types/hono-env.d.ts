import { AuthService } from '../services/auth.service';

export type HonoEnv = {
	Bindings: Env;
	Variables: {
		authService: AuthService;
		csrfToken: string;
		logger: Logger;
	};
};
