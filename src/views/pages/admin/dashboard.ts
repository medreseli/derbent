import { html } from 'hono/html';
import { adminLayout } from '../../components/admin-layout';

// Helper to mask UUIDs. Turns "123e4567-e89b-12d3-a456-426614174000" into "123e4567-••••-••••-••••-••••••••4000"
function maskToken(token: string): string {
	if (token.length < 12) return '***';
	return `${token.substring(0, 8)}-••••-••••-••••-••••••••${token.substring(token.length - 4)}`;
}

export const adminDashboardPage = (users: any[], kvKeys: any[]) => {
	const userRows = users.map((u) => {
		const verifiedBadge =
			u.email_verified === 1
				? html`<span class="badge badge-success">Verified</span>`
				: html`<span class="badge badge-warning">Pending</span>`;

		const appBadge =
			u.app === 'sso' ? html`<span class="badge badge-neutral">SSO</span>` : html`<span class="badge badge-neutral">${u.app}</span>`;

		return html`
			<tr>
				<td><span class="code">${u.id.split('-')[0]}...</span></td>
				<td>${u.email}</td>
				<td>${appBadge}</td>
				<td>${verifiedBadge}</td>
				<td>${new Date(u.created_at).toLocaleString()}</td>
			</tr>
		`;
	});

	const kvRows = kvKeys.map((k) => {
		let type = 'Session';
		let maskedName = maskToken(k.name); // Default masking for raw session UUIDs

		// Safely mask prefixed tokens
		if (k.name.startsWith('verify_email:')) {
			type = 'Email Verify';
			maskedName = `verify_email:${maskToken(k.name.replace('verify_email:', ''))}`;
		} else if (k.name.startsWith('reset_pwd:')) {
			type = 'Pwd Reset';
			maskedName = `reset_pwd:${maskToken(k.name.replace('reset_pwd:', ''))}`;
		} else if (k.name.startsWith('magic_link:')) {
			type = 'Magic Link';
			maskedName = `magic_link:${maskToken(k.name.replace('magic_link:', ''))}`;
		}

		const exp = k.expiration ? new Date(k.expiration * 1000).toLocaleString() : 'Never';

		return html`
			<tr>
				<td><span class="code" style="letter-spacing: 0.5px;">${maskedName}</span></td>
				<td><span class="badge badge-neutral">${type}</span></td>
				<td>${exp}</td>
			</tr>
		`;
	});

	const content = html`
		<div class="card">
			<h2>D1 Database: Recent Users</h2>
			${users.length === 0
				? html`<p style="color: var(--text-muted);">No users found.</p>`
				: html`
						<table>
							<thead>
								<tr>
									<th>ID</th>
									<th>Email</th>
									<th>App</th>
									<th>Status</th>
									<th>Created At</th>
								</tr>
							</thead>
							<tbody>
								${userRows}
							</tbody>
						</table>
					`}
		</div>

		<div class="card">
			<h2>KV Store: Active Keys (Masked for Security)</h2>
			<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: -0.5rem; margin-bottom: 1rem;">
				Showing up to 100 current keys. UUIDs are masked to prevent session hijacking and account takeover.
			</p>
			${kvKeys.length === 0
				? html`<p style="color: var(--text-muted);">No active keys found.</p>`
				: html`
						<table>
							<thead>
								<tr>
									<th>Key</th>
									<th>Type</th>
									<th>Expires At</th>
								</tr>
							</thead>
							<tbody>
								${kvRows}
							</tbody>
						</table>
					`}
		</div>
	`;

	return adminLayout('Dashboard', content);
};
