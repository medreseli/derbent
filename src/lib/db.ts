import { User } from '../types/user';

export async function getUserByEmailAndApp(env: Env, email: string, app: string): Promise<User | null> {
	return await env.DB.prepare('SELECT * FROM users WHERE email = ? AND app = ?').bind(email, app).first<User>();
}

export async function getLoginUser(env: Env, email: string, app: string): Promise<User | null> {
	// Evaluates the existence of 'sso' account first.
	// If it doesn't exist, evaluates app-specific account.
	return await env.DB.prepare(
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

export async function hasAnyAppAccount(env: Env, email: string): Promise<boolean> {
	const user = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND app != 'sso'").bind(email).first();
	return user !== null;
}

export async function createUser(env: Env, id: string, app: string, email: string, phash: string): Promise<void> {
	await env.DB.prepare('INSERT INTO users (id, app, email, phash) VALUES (?, ?, ?, ?)').bind(id, app, email, phash).run();
}
