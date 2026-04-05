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
}
