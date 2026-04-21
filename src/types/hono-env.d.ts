import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { AppRepository } from '../repositories/app.repository';

export type HonoEnv = {
	Bindings: Env;
	Variables: {
		adminService: AdminService;
		authService: AuthService;
		appRepo: AppRepository;
		csrfToken: string;
		logger: Logger;
	};
};
