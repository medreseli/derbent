import { User } from '../types/user';

export class UserRepository {
	constructor(private db: D1Database) {}

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
			.prepare('INSERT INTO users (id, app, email, phash, metadata, email_verified) VALUES (?, ?, ?, ?, ?, ?)')
			.bind(user.id, user.app, user.email, user.phash, user.metadata, user.email_verified)
			.run();
	}

	async markEmailVerified(userId: string): Promise<void> {
		await this.db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
	}
}
