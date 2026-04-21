import { User } from '../types/user';

export class UserRepository {
	constructor(private db: D1Database) {}

	async findById(id: string): Promise<User | null> {
		return await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
	}

	async findByEmailAndApp(email: string, app: string): Promise<User | null> {
		return await this.db.prepare('SELECT * FROM users WHERE email = ? AND app = ?').bind(email, app).first<User>();
	}

	async findAllByEmail(email: string): Promise<User[]> {
		const { results } = await this.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).all<User>();
		return results || [];
	}

	async findForLogin(email: string, app: string): Promise<User | null> {
		return await this.db
			.prepare(
				`
					SELECT * FROM users 
					WHERE email = ? AND (app = ? OR app = 'sso') 
					ORDER BY app = 'sso' DESC 
					LIMIT 1
				`,
			)
			.bind(email, app)
			.first<User>();
	}

	async hasAnyAppAccount(email: string): Promise<boolean> {
		const result = await this.db.prepare("SELECT id FROM users WHERE email = ? AND app != 'sso'").bind(email).first();
		return result !== null;
	}

	async create(user: Omit<User, 'created_at' | 'updated_at'>): Promise<void> {
		await this.db
			.prepare(
				'INSERT INTO users (id, app, email, phash, metadata, email_verified, token_version, two_factor_secret, two_factor_enabled, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
			)
			.bind(
				user.id,
				user.app,
				user.email,
				user.phash,
				user.metadata,
				user.email_verified,
				user.token_version,
				user.two_factor_secret,
				user.two_factor_enabled,
				user.is_locked,
			)
			.run();
	}

	async setLockedStatus(userId: string, locked: boolean): Promise<void> {
		await this.db
			.prepare('UPDATE users SET is_locked = ? WHERE id = ?')
			.bind(locked ? 1 : 0, userId)
			.run();
	}

	async markEmailVerified(userId: string): Promise<void> {
		await this.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
	}

	async updatePassword(userId: string, phash: string): Promise<void> {
		await this.db
			.prepare('UPDATE users SET phash = ?, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
			.bind(phash, userId)
			.run();
	}

	async updatePasswordHash(userId: string, phash: string): Promise<void> {
		// Unlike updatePassword, this silently updates the hash without bumping the token_version
		// so active sessions are not disrupted by the transparent upgrade.
		await this.db.prepare('UPDATE users SET phash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(phash, userId).run();
	}

	async incrementTokenVersion(userId: string): Promise<number> {
		const result = await this.db
			.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ? RETURNING token_version')
			.bind(userId)
			.first<{ token_version: number }>();

		if (!result) throw new Error('User not found during version increment');
		return result.token_version;
	}

	async enableTwoFactor(userId: string, secret: string): Promise<void> {
		await this.db.prepare('UPDATE users SET two_factor_secret = ?, two_factor_enabled = 1 WHERE id = ?').bind(secret, userId).run();
	}

	async disableTwoFactor(userId: string): Promise<void> {
		await this.db.prepare('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = 0 WHERE id = ?').bind(userId).run();
	}

	// --- ADMIN API METHODS ---

	async findMany(limit: number, offset: number, search?: string): Promise<User[]> {
		let query = 'SELECT * FROM users';
		const params: any[] = [];

		if (search) {
			query += ' WHERE email LIKE ? OR id = ?';
			params.push(`%${search}%`, search);
		}

		query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const { results } = await this.db
			.prepare(query)
			.bind(...params)
			.all<User>();
		return results || [];
	}

	async count(search?: string): Promise<number> {
		let query = 'SELECT COUNT(*) as total FROM users';
		const params: any[] = [];

		if (search) {
			query += ' WHERE email LIKE ? OR id = ?';
			params.push(`%${search}%`, search);
		}

		const result = await this.db
			.prepare(query)
			.bind(...params)
			.first<{ total: number }>();
		return result?.total || 0;
	}

	async countByApp(appId: string): Promise<number> {
		const result = await this.db.prepare('SELECT COUNT(*) as total FROM users WHERE app = ?').bind(appId).first<{ total: number }>();
		return result?.total || 0;
	}

	async update(id: string, data: Partial<Pick<User, 'metadata' | 'email_verified' | 'app'>>): Promise<User | null> {
		const updates: string[] = [];
		const params: any[] = [];

		if (data.metadata !== undefined) {
			updates.push('metadata = ?');
			params.push(data.metadata);
		}
		if (data.email_verified !== undefined) {
			updates.push('email_verified = ?');
			params.push(data.email_verified);
		}
		if (data.app !== undefined) {
			updates.push('app = ?');
			params.push(data.app);
		}

		if (updates.length > 0) {
			params.push(id);
			const query = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
			await this.db
				.prepare(query)
				.bind(...params)
				.run();
		}

		return this.findById(id);
	}

	async delete(id: string): Promise<void> {
		await this.db.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
	}

	async getDashboardStats(): Promise<{ total: number; newLast7Days: number; mfaEnabled: number; locked: number }> {
		const result = await this.db
			.prepare(
				`SELECT 
					COUNT(*) as total,
					SUM(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as newLast7Days,
					SUM(CASE WHEN two_factor_enabled = 1 THEN 1 ELSE 0 END) as mfaEnabled,
					SUM(CASE WHEN is_locked = 1 THEN 1 ELSE 0 END) as locked
				FROM users`,
			)
			.first<{ total: number; newLast7Days: number; mfaEnabled: number; locked: number }>();

		return {
			total: result?.total || 0,
			newLast7Days: result?.newLast7Days || 0,
			mfaEnabled: result?.mfaEnabled || 0,
			locked: result?.locked || 0,
		};
	}

	async getSignupsTrend(days: number): Promise<{ date: string; count: number }[]> {
		const { results } = await this.db
			.prepare(
				`SELECT 
					DATE(created_at) as date, 
					COUNT(*) as count
				FROM users
				WHERE created_at >= date('now', ?)
				GROUP BY DATE(created_at)
				ORDER BY date ASC`,
			)
			.bind(`-${days} days`)
			.all<{ date: string; count: number }>();

		return results || [];
	}
}
