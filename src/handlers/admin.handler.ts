import { Context } from 'hono';
import { HonoEnv } from '../types/hono-env';
import * as v from 'valibot';
import { AdminForcePasswordSchema, AdminLockAccountSchema, AdminUpdateUserSchema } from '../utils/validation';
import { AppError } from '../types/errors';

export class AdminHandler {
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
		// Since the router won't even match the endpoint if the ID is missing,
		// we can safely tell TypeScript that it is definitely a string using "as string"
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
}
