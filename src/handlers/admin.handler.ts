import { Context } from 'hono';
import { HonoEnv } from '../types/hono-env';
import { adminDashboardPage } from '../views/pages/admin/dashboard';

export class AdminHandler {
	static async renderDashboard(c: Context<HonoEnv>) {
		// 1. Fetch recent users from D1
		const { results: users } = await c.env.DB.prepare(
			'SELECT id, email, app, email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 50',
		).all();

		// 2. Fetch keys from KV (Sessions, verification tokens, magic links)
		// We use list() to get up to 100 keys
		const kvList = await c.env.KV.list({ limit: 100 });

		return c.html(adminDashboardPage(users || [], kvList.keys || []));
	}
}
