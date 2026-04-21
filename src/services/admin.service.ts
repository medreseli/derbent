import { AppRepository } from '../repositories/app.repository';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { UserTokenVersionRepository } from '../repositories/user-token-version.repository';
import { UserRepository } from '../repositories/user.repository';
import { AppRecord } from '../types/app';
import { AppError } from '../types/errors';
import { User } from '../types/user';
import { hashPassword } from '../utils/crypto';

export class AdminService {
	constructor(
		private userRepo: UserRepository,
		private auditLogRepo: AuditLogRepository,
		private userTokenVersionRepo: UserTokenVersionRepository,
		private appRepo: AppRepository,
		private hashIterations: number,
	) {}

	async getUsers(page: number, limit: number, search?: string) {
		const offset = (page - 1) * limit;
		const users = await this.userRepo.findMany(limit, offset, search);
		const total = await this.userRepo.count(search);

		return { data: users, total, page, limit };
	}

	async getDashboardStats() {
		const daysForTrend = 30;

		// Run all queries concurrently for maximum performance
		const [userStats, auditStats, signupsRaw, loginsRaw] = await Promise.all([
			this.userRepo.getDashboardStats(),
			this.auditLogRepo.getDashboardStats(),
			this.userRepo.getSignupsTrend(daysForTrend),
			this.auditLogRepo.getLoginsTrend(daysForTrend),
		]);

		const mfaPercentage = userStats.total > 0 ? Math.round((userStats.mfaEnabled / userStats.total) * 100) : 0;

		// Utility to generate a contiguous list of the last N days (YYYY-MM-DD)
		const dates: string[] = [];
		const now = new Date();
		for (let i = daysForTrend - 1; i >= 0; i--) {
			const d = new Date(now);
			d.setDate(d.getDate() - i);
			dates.push(d.toISOString().split('T')[0]);
		}

		// Zero-fill the missing days in memory for the frontend charts
		const signupsMap = new Map(signupsRaw.map((r) => [r.date, r.count]));
		const signupsTrend = dates.map((date) => ({
			date,
			count: signupsMap.get(date) || 0,
		}));

		const loginsMap = new Map(loginsRaw.map((r) => [r.date, r]));
		const loginsTrend = dates.map((date) => ({
			date,
			success: loginsMap.get(date)?.success || 0,
			failed: loginsMap.get(date)?.failed || 0,
		}));

		return {
			users: {
				total: userStats.total,
				newLast7Days: userStats.newLast7Days,
				mfaEnabled: userStats.mfaEnabled,
				mfaPercentage,
				locked: userStats.locked,
			},
			activity: {
				failedLogins24h: auditStats.failedLogins24h,
				lockouts24h: auditStats.lockouts24h,
				pwdResets24h: auditStats.pwdResets24h,
			},
			trends: {
				signups: signupsTrend,
				logins: loginsTrend,
			},
		};
	}

	async getUser(userId: string): Promise<User> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);
		return user;
	}

	async updateUser(userId: string, data: { metadata?: Record<string, any>; email_verified?: 0 | 1; app?: string }): Promise<User> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		const updates: any = {};
		if (data.metadata !== undefined) updates.metadata = JSON.stringify(data.metadata);
		if (data.email_verified !== undefined) updates.email_verified = data.email_verified;
		if (data.app !== undefined) updates.app = data.app;

		const updatedUser = await this.userRepo.update(userId, updates);

		await this.auditLogRepo.log({
			action: 'admin_update_user',
			userId: user.id,
			email: user.email,
			details: { updates },
		});

		return updatedUser!;
	}

	async forceResetPassword(userId: string, newPassword: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		if (user.phash.startsWith('OAUTH:')) {
			throw new AppError('Cannot reset password for OAuth-only accounts.', 400);
		}

		const phash = await hashPassword(newPassword, this.hashIterations);
		await this.userRepo.updatePassword(userId, phash);
		await this.userTokenVersionRepo.clearUserVersion(userId); // Instantly revokes all active sessions

		await this.auditLogRepo.log({
			action: 'admin_force_password_reset',
			userId: user.id,
			email: user.email,
		});
	}

	async disable2FA(userId: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		if (user.two_factor_enabled === 0) {
			throw new AppError('2FA is already disabled for this user.', 400);
		}

		await this.userRepo.disableTwoFactor(userId);

		await this.auditLogRepo.log({
			action: 'admin_disable_2fa',
			userId: user.id,
			email: user.email,
		});
	}

	async deleteUser(userId: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		// Delete user and their logs
		await this.auditLogRepo.deleteByUserId(userId);
		await this.userRepo.delete(userId);
		await this.userTokenVersionRepo.clearUserVersion(userId);

		// We log the deletion without a userId since it no longer exists
		await this.auditLogRepo.log({
			action: 'admin_delete_user',
			email: user.email,
			details: { deletedUserId: userId },
		});
	}

	async revokeAllSessions(userId: string): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		await this.userRepo.incrementTokenVersion(userId);
		await this.userTokenVersionRepo.clearUserVersion(userId); // Instantly drops active sessions globally

		await this.auditLogRepo.log({
			action: 'admin_revoke_sessions',
			userId: user.id,
			email: user.email,
		});
	}

	async setAccountLockStatus(userId: string, locked: boolean): Promise<void> {
		const user = await this.userRepo.findById(userId);
		if (!user) throw new AppError('User not found', 404);

		if (user.is_locked === (locked ? 1 : 0)) return; // No change needed

		await this.userRepo.setLockedStatus(userId, locked);

		// If we are locking the account, immediately boot them out of active sessions
		if (locked) {
			await this.userRepo.incrementTokenVersion(userId);
			await this.userTokenVersionRepo.clearUserVersion(userId);
		}

		await this.auditLogRepo.log({
			action: locked ? 'admin_lock_account' : 'admin_unlock_account',
			userId: user.id,
			email: user.email,
		});
	}

	// --- AUDIT LOGS ---

	async getAuditLogs(page: number, limit: number, action?: string) {
		const offset = (page - 1) * limit;
		const data = await this.auditLogRepo.findMany(limit, offset, action);
		const total = await this.auditLogRepo.count(action);

		return { data, total, page, limit };
	}

	async getUserAuditLogs(userId: string, page: number, limit: number) {
		const offset = (page - 1) * limit;
		const data = await this.auditLogRepo.findByUserId(userId, limit, offset);
		const total = await this.auditLogRepo.countByUserId(userId);

		return { data, total, page, limit };
	}

	// --- APPS MANAGEMENT ---

	async getApps(): Promise<AppRecord[]> {
		return await this.appRepo.findAll();
	}

	async getApp(appId: string): Promise<AppRecord> {
		const app = await this.appRepo.findById(appId);
		if (!app) throw new AppError('App not found', 404);
		return app;
	}

	async createApp(data: Omit<AppRecord, 'created_at' | 'updated_at'>): Promise<void> {
		const existing = await this.appRepo.findById(data.id);
		if (existing) throw new AppError('An app with this ID already exists.', 400);

		await this.appRepo.create(data);

		await this.auditLogRepo.log({
			action: 'admin_create_app',
			details: { appId: data.id, appName: data.name },
		});
	}

	async updateApp(appId: string, data: Partial<Omit<AppRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<AppRecord> {
		const app = await this.appRepo.findById(appId);
		if (!app) throw new AppError('App not found', 404);

		const updatedApp = await this.appRepo.update(appId, data);

		await this.auditLogRepo.log({
			action: 'admin_update_app',
			details: { appId, updates: data },
		});

		return updatedApp!;
	}

	async deleteApp(appId: string): Promise<void> {
		const app = await this.appRepo.findById(appId);
		if (!app) throw new AppError('App not found', 404);

		if (appId === 'sso') {
			throw new AppError('The core SSO app cannot be deleted.', 403);
		}

		// Prevent deletion if users are tied to this app
		const userCount = await this.userRepo.countByApp(appId);
		if (userCount > 0) {
			throw new AppError(`Cannot delete app. There are ${userCount} users associated with it. Please disable logins instead.`, 400);
		}

		await this.appRepo.delete(appId);

		await this.auditLogRepo.log({
			action: 'admin_delete_app',
			details: { appId, appName: app.name },
		});
	}
}
