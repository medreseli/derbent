import { Context } from 'hono';
import { HonoEnv } from '../types/hono-env';
import * as v from 'valibot';
import {
	AdminCreateAppSchema,
	AdminForcePasswordSchema,
	AdminLockAccountSchema,
	AdminUpdateAppSchema,
	AdminUpdateSettingsSchema,
	AdminUpdateUserSchema,
} from '../utils/validation';
import { AppError } from '../types/errors';

export class AdminHandler {
	static async getSettings(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const effectiveConfig = c.get('config');

		try {
			const enrichedConfig = await adminService.getSettings(effectiveConfig);
			return c.json({ data: enrichedConfig });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async updateSettings(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const masterKey = c.env.DERBENT_API_KEY!;

		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminUpdateSettingsSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			await adminService.updateSettings(result.output as Record<string, any>, masterKey);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getStats(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		try {
			const stats = await adminService.getDashboardStats();
			return c.json(stats);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getUsers(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));
		const search = c.req.query('search');

		const result = await adminService.getUsers(page, limit, search);
		return c.json(result);
	}

	static async getUser(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			const user = await adminService.getUser(id);
			return c.json(user);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async updateUser(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminUpdateUserSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			const user = await adminService.updateUser(id, result.output);
			return c.json({ success: true, user });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async forceResetPassword(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminForcePasswordSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			await adminService.forceResetPassword(id, result.output.newPassword);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async disable2FA(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			await adminService.disable2FA(id);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async deleteUser(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			await adminService.deleteUser(id);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async revokeSessions(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			await adminService.revokeAllSessions(id);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async lockAccount(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;

		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminLockAccountSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			await adminService.setAccountLockStatus(id, result.output.locked);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getAuditLogs(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50));
		const action = c.req.query('action');

		try {
			const result = await adminService.getAuditLogs(page, limit, action);
			return c.json(result);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getUserAuditLogs(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;
		const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1);
		const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20));

		try {
			const result = await adminService.getUserAuditLogs(id, page, limit);
			return c.json(result);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getApps(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		try {
			const apps = await adminService.getApps();
			return c.json({ data: apps });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async getApp(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;
		try {
			const app = await adminService.getApp(id);
			return c.json(app);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async createApp(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminCreateAppSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			await adminService.createApp(result.output as any);
			return c.json({ success: true }, 201);
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async updateApp(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;
		try {
			const body = await c.req.json();
			const result = v.safeParse(AdminUpdateAppSchema, body);

			if (!result.success) {
				return c.json({ error: 'Validation failed', issues: result.issues }, 400);
			}

			const app = await adminService.updateApp(id, result.output as any);
			return c.json({ success: true, app });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}

	static async deleteApp(c: Context<HonoEnv>) {
		const adminService = c.get('adminService');
		const id = c.req.param('id') as string;
		try {
			await adminService.deleteApp(id);
			return c.json({ success: true });
		} catch (err) {
			const status = err instanceof AppError ? err.status : 500;
			const msg = err instanceof AppError ? err.message : 'Internal Server Error';
			return c.json({ error: msg }, status);
		}
	}
}
