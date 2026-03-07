import { html } from 'hono/html';
import { layout } from '../components/layout';
import { Session } from '../../types/session';

export interface AppViewConfig {
	id: string;
	name: string;
	description: string;
	url: string;
}

export interface AppStatus {
	config: AppViewConfig;
	session: Session | null;
	isSsoFallback: boolean;
}

export const landingPage = (appName: string, csrfToken: string, apps: AppStatus[], hasAnySession: boolean, successMsg?: string) => {
	const successHtml = successMsg
		? html`<div class="error" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">${successMsg}</div>`
		: '';

	const globalLogoutHtml = hasAnySession
		? html`
				<div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
					<div class="btn-group" style="margin-bottom: 1rem;">
						<a href="/change-password" class="btn btn-secondary">Change Password</a>
						<a href="/2fa/setup" class="btn btn-secondary">Manage 2FA</a>
					</div>
					<form method="POST" action="/logout-all-email?app_id=sso&redirect=/" style="width: 100%; margin: 0;">
						<input type="hidden" name="csrf_token" value="${csrfToken}" />
						<button type="submit" class="btn btn-danger" style="margin: 0; padding: 0.75rem; width: 100%;">
							Global Logout (Log out of everything)
						</button>
					</form>
				</div>
			`
		: '';

	const appsHtml = apps.map((app) => {
		const isLoggedIn = app.session !== null;
		const ssoBadge = app.isSsoFallback ? html`<span class="badge badge-active">SSO Active</span>` : '';
		const activeBadge = isLoggedIn && !app.isSsoFallback ? html`<span class="badge badge-active">Active</span>` : '';

		let actions;
		if (isLoggedIn) {
			actions = html`
				<div class="app-actions">
					<a href="${app.config.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="flex: 2;">Open App</a>
					<form method="POST" action="/logout?app_id=${app.config.id}&redirect=/" style="flex: 1; margin: 0;">
						<input type="hidden" name="csrf_token" value="${csrfToken}" />
						<button type="submit" class="btn btn-danger" style="margin: 0; padding: 0.5rem 0.75rem; width: 100%;">Log out</button>
					</form>
				</div>
				<p style="font-size: 0.75rem; margin-top: 0.25rem;">Signed in as <strong>${app.session?.email}</strong></p>
			`;
		} else {
			actions = html`
				<div class="app-actions">
					<a href="/login?app_id=${app.config.id}&redirect=/" class="btn btn-primary">Log in</a>
					<a href="/register?app_id=${app.config.id}&redirect=/" class="btn btn-secondary">Register</a>
				</div>
			`;
		}

		return html`
			<div class="app-card">
				<div class="app-card-header">
					<h3>${app.config.name}</h3>
					<div>${ssoBadge} ${activeBadge}</div>
				</div>
				<p>${app.config.description}</p>
				${actions}
			</div>
		`;
	});

	return layout(
		appName,
		html`
			<p class="lead">A derbent was a fortified pass &mdash; a narrow gate between worlds, guarded and deliberate.</p>
			<p class="lead" style="margin-bottom: 0;">Manage your identity and access across our applications.</p>
			${successHtml}

			<div class="app-grid">${appsHtml}</div>

			${globalLogoutHtml}
		`,
	);
};
