import { User } from '../types/user';

export class UserRepository {
	constructor(private db: D1Database) {}

	async findById(id: string): Promise<User | null> {
		return await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
	}

	async findByEmailAndApp(email: string, app: string): Promise<User | null> {
		return await this.db.prepare('SELECT * FROM users WHERE email = ? AND app = ?').bind(email, app).first<User>();
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

	async create(user: User): Promise<void> {
		await this.db
			.prepare('INSERT INTO users (id, app, email, phash, metadata, email_verified, token_version) VALUES (?, ?, ?, ?, ?, ?, ?)')
			.bind(user.id, user.app, user.email, user.phash, user.metadata, user.email_verified, user.token_version)
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

	async incrementTokenVersion(userId: string): Promise<number> {
		const result = await this.db
			.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ? RETURNING token_version')
			.bind(userId)
			.first<{ token_version: number }>();

		if (!result) throw new Error('User not found during version increment');
		return result.token_version;
	}
}
