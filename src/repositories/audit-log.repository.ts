export interface AuditLogEntry {
	userId?: string | null;
	action: string;
	email?: string;
	ip?: string;
	userAgent?: string;
	details?: Record<string, any>;
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
			// Fail silently to avoid breaking the user flow, but log to worker console
			console.error('[AuditLog] Failed to write log:', error);
		}
	}

	/**
	 * Deletes audit logs older than the specified number of days.
	 */
	async prune(daysToKeep: number = 30): Promise<number> {
		try {
			// SQLite allows date math using datetime('now', '-X days')
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
}
