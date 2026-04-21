export interface AuditLogEntry {
	userId?: string | null;
	action: string;
	email?: string;
	ip?: string;
	userAgent?: string;
	details?: Record<string, any>;
}

export interface AuditLogRecord {
	id: number;
	user_id: string | null;
	action: string;
	email: string | null;
	ip: string | null;
	user_agent: string | null;
	details: string | null;
	created_at: string;
}

export class AuditLogRepository {
	constructor(private db: D1Database) {}

	async log(entry: AuditLogEntry): Promise<void> {
		try {
			await this.db
				.prepare('INSERT INTO audit_logs (user_id, action, email, ip, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)')
				.bind(
					entry.userId || null,
					entry.action,
					entry.email || null,
					entry.ip || null,
					entry.userAgent || null,
					entry.details ? JSON.stringify(entry.details) : null,
				)
				.run();
		} catch (error) {
			console.error('[AuditLog] Failed to write log:', error);
		}
	}

	async prune(daysToKeep: number = 30): Promise<number> {
		try {
			const result = await this.db
				.prepare(`DELETE FROM audit_logs WHERE created_at < datetime('now', ?)`)
				.bind(`-${daysToKeep} days`)
				.run();

			return result.meta.changes;
		} catch (error) {
			console.error('[AuditLog] Failed to prune logs:', error);
			return 0;
		}
	}

	async deleteByUserId(userId: string): Promise<void> {
		try {
			await this.db.prepare('DELETE FROM audit_logs WHERE user_id = ?').bind(userId).run();
		} catch (error) {
			console.error('[AuditLog] Failed to delete logs for user:', error);
		}
	}

	// --- ADMIN API METHODS ---

	async findMany(limit: number, offset: number, action?: string): Promise<AuditLogRecord[]> {
		let query = 'SELECT * FROM audit_logs';
		const params: any[] = [];

		if (action) {
			query += ' WHERE action = ?';
			params.push(action);
		}

		query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const { results } = await this.db
			.prepare(query)
			.bind(...params)
			.all<AuditLogRecord>();
		return results || [];
	}

	async count(action?: string): Promise<number> {
		let query = 'SELECT COUNT(*) as total FROM audit_logs';
		const params: any[] = [];

		if (action) {
			query += ' WHERE action = ?';
			params.push(action);
		}

		const result = await this.db
			.prepare(query)
			.bind(...params)
			.first<{ total: number }>();
		return result?.total || 0;
	}

	async findByUserId(userId: string, limit: number, offset: number): Promise<AuditLogRecord[]> {
		const { results } = await this.db
			.prepare('SELECT * FROM audit_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
			.bind(userId, limit, offset)
			.all<AuditLogRecord>();
		return results || [];
	}

	async countByUserId(userId: string): Promise<number> {
		const result = await this.db
			.prepare('SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?')
			.bind(userId)
			.first<{ total: number }>();
		return result?.total || 0;
	}

	async getDashboardStats(): Promise<{ failedLogins24h: number; lockouts24h: number; pwdResets24h: number }> {
		const result = await this.db
			.prepare(
				`SELECT
					SUM(CASE WHEN action = 'login_failed' THEN 1 ELSE 0 END) as failedLogins24h,
					SUM(CASE WHEN action = 'login_locked_out' THEN 1 ELSE 0 END) as lockouts24h,
					SUM(CASE WHEN action = 'password_reset_requested' THEN 1 ELSE 0 END) as pwdResets24h
				FROM audit_logs
				WHERE created_at >= datetime('now', '-1 day')`,
			)
			.first<{ failedLogins24h: number; lockouts24h: number; pwdResets24h: number }>();

		return {
			failedLogins24h: result?.failedLogins24h || 0,
			lockouts24h: result?.lockouts24h || 0,
			pwdResets24h: result?.pwdResets24h || 0,
		};
	}

	async getLoginsTrend(days: number): Promise<{ date: string; success: number; failed: number }[]> {
		const { results } = await this.db
			.prepare(
				`SELECT 
					DATE(created_at) as date,
					SUM(CASE WHEN action = 'login_success' THEN 1 ELSE 0 END) as success,
					SUM(CASE WHEN action LIKE 'login_failed%' THEN 1 ELSE 0 END) as failed
				FROM audit_logs
				WHERE action IN ('login_success', 'login_failed', 'login_failed_locked')
				  AND created_at >= date('now', ?)
				GROUP BY DATE(created_at)
				ORDER BY date ASC`,
			)
			.bind(`-${days} days`)
			.all<{ date: string; success: number; failed: number }>();

		return results || [];
	}
}
