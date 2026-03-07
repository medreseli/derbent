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

	// Identify SSO application vs Regular integrated applications
	const ssoApp = apps.find((a) => a.config.id === 'sso');
	const regularApps = apps.filter((a) => a.config.id !== 'sso');

	// Check if global SSO session is active
	const isSsoActive = ssoApp && ssoApp.session !== null;

	let contentHtml;

	if (isSsoActive) {
		// SSO Active View: Display the info banner and the list of available apps
		contentHtml = html`
			<div class="info-banner">
				<h3>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="16" x2="12" y2="12"></line>
						<line x1="12" y1="8" x2="12.01" y2="8"></line>
					</svg>
					Global SSO Active
				</h3>
				<p>You are securely logged in as <strong>${ssoApp!.session!.email}</strong>. You can instantly access the applications below.</p>
				<ul class="app-links">
					${regularApps.map(
						(app) => html`
							<li>
								<a href="${app.config.url}" target="_blank" rel="noopener noreferrer">
									${app.config.name}
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
										<polyline points="15 3 21 3 21 9"></polyline>
										<line x1="10" y1="14" x2="21" y2="3"></line>
									</svg>
								</a>
							</li>
						`,
					)}
				</ul>
			</div>
		`;
	} else {
		// Table View: Display active sessions or apps available for login
		const tableRows = apps.map((app) => {
			const isLoggedIn = app.session !== null;

			let actionHtml;
			if (isLoggedIn) {
				actionHtml = html`
					<div style="display: flex; gap: 0.5rem; align-items: center;">
						<a
							href="${app.config.url}"
							target="_blank"
							class="btn btn-secondary"
							style="padding: 0.35rem 0.65rem; font-size: 0.75rem; margin: 0; width: auto;"
							>Open</a
						>
						<form method="POST" action="/logout?app_id=${app.config.id}&redirect=/" style="margin: 0;">
							<input type="hidden" name="csrf_token" value="${csrfToken}" />
							<button type="submit" class="btn btn-danger" style="margin: 0; padding: 0.35rem 0.65rem; font-size: 0.75rem; width: auto;">
								Log out
							</button>
						</form>
					</div>
				`;
			} else {
				actionHtml = html`
					<a
						href="/login?app_id=${app.config.id}&redirect=/"
						class="btn btn-primary"
						style="padding: 0.35rem 0.65rem; font-size: 0.75rem; width: auto; display: inline-block;"
						>Log in</a
					>
				`;
			}

			return html`
				<tr>
					<td style="font-weight: 500;">${app.config.name}</td>
					<td style="color: var(--text-muted);">${isLoggedIn ? app.session!.email : '-'}</td>
					<td>${actionHtml}</td>
				</tr>
			`;
		});

		contentHtml = html`
			<div class="table-container">
				<table>
					<thead>
						<tr>
							<th>Application</th>
							<th>Signed in as</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						${tableRows}
					</tbody>
				</table>
			</div>
		`;
	}

	const topActionsHtml = hasAnySession
		? html`
				<div class="top-actions">
					<div class="dropdown">
						<button class="btn btn-secondary" style="margin: 0; padding: 0.5rem 1rem;">Settings ▾</button>
						<div class="dropdown-content">
							<a href="/change-password" class="dropdown-item">Change Password</a>
							<a href="/2fa/setup" class="dropdown-item">Manage 2FA</a>
						</div>
					</div>
					<div class="dropdown">
						<button class="btn btn-secondary" style="margin: 0; padding: 0.5rem 1rem;">Logout ▾</button>
						<div class="dropdown-content">
							<form method="POST" action="/logout?app_id=sso&redirect=/" style="margin: 0;">
								<input type="hidden" name="csrf_token" value="${csrfToken}" />
								<button type="submit" class="dropdown-item">Log out of this device</button>
							</form>
							<div class="dropdown-divider"></div>
							<form method="POST" action="/logout-all-email?app_id=sso&redirect=/" style="margin: 0;">
								<input type="hidden" name="csrf_token" value="${csrfToken}" />
								<button type="submit" class="dropdown-item text-danger">Log out everywhere</button>
							</form>
						</div>
					</div>
				</div>
			`
		: '';

	return layout(
		appName,
		html`
			<p class="subtitle" style="margin-bottom: 2rem;">Manage your identity and access across our applications.</p>

			${successHtml} ${topActionsHtml} ${contentHtml}
		`,
	);
};
