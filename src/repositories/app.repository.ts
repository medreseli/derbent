import { AppRecord } from '../types/app';

export class AppRepository {
	constructor(private db: D1Database) {}

	async findAll(): Promise<AppRecord[]> {
		const { results } = await this.db.prepare('SELECT * FROM apps ORDER BY created_at ASC').all<AppRecord>();
		return results || [];
	}

	async findById(id: string): Promise<AppRecord | null> {
		return await this.db.prepare('SELECT * FROM apps WHERE id = ?').bind(id).first<AppRecord>();
	}

	async create(app: Omit<AppRecord, 'created_at' | 'updated_at'>): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO apps (id, name, description, icon, prod_url, dev_url, allow_signups, allow_logins) 
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(app.id, app.name, app.description, app.icon, app.prod_url, app.dev_url, app.allow_signups, app.allow_logins)
			.run();
	}

	async update(id: string, data: Partial<Omit<AppRecord, 'id' | 'created_at' | 'updated_at'>>): Promise<AppRecord | null> {
		const updates: string[] = [];
		const params: any[] = [];

		const fields: (keyof typeof data)[] = ['name', 'description', 'icon', 'prod_url', 'dev_url', 'allow_signups', 'allow_logins'];

		for (const field of fields) {
			if (data[field] !== undefined) {
				updates.push(`${field} = ?`);
				params.push(data[field]);
			}
		}

		if (updates.length > 0) {
			params.push(id);
			const query = `UPDATE apps SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
			await this.db
				.prepare(query)
				.bind(...params)
				.run();
		}

		return this.findById(id);
	}

	async delete(id: string): Promise<void> {
		await this.db.prepare('DELETE FROM apps WHERE id = ?').bind(id).run();
	}
}
