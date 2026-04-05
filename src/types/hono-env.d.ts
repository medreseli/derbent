import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';

export type HonoEnv = {
	Bindings: Env;
	Variables: {
		adminService: AdminService;
		authService: AuthService;
		csrfToken: string;
		logger: Logger;
	};
};
