import { html } from 'hono/html';
import { layout } from '../components/layout';
import { Session } from '../../types/session';

export const landingPage = (csrfToken: string, session?: Session | null) => {
	let actionArea;

	if (session) {
		actionArea = html`
			<div style="text-align: center; margin-bottom: 2rem;">
				<span
					style="display: inline-block; padding: 0.5rem 1rem; background: #e4e4e7; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; color: #3f3f46;"
				>
					Signed in as <strong>${session.email}</strong>
				</span>
			</div>

			<div style="display: flex; flex-direction: column; gap: 0.75rem;">
				<form method="POST" action="/logout?app_id=${session.appId}&redirect=/" style="width: 100%; margin: 0;">
					<input type="hidden" name="csrf_token" value="${csrfToken}" />
					<button
						type="submit"
						style="background: #fff; color: var(--text-main); border: 1px solid var(--border); box-shadow: 0 1px 2px rgba(0,0,0,0.05); margin-top: 0;"
					>
						Log out
					</button>
				</form>

				<form method="POST" action="/logout-all?app_id=${session.appId}&redirect=/" style="width: 100%; margin: 0;">
					<input type="hidden" name="csrf_token" value="${csrfToken}" />
					<button
						type="submit"
						style="background: transparent; color: #ef4444; border: 1px solid #fca5a5; margin-top: 0;"
						onmouseover="this.style.background='#fef2f2'"
						onmouseout="this.style.background='transparent'"
					>
						Log out of all devices
					</button>
				</form>
			</div>
		`;
	} else {
		actionArea = html`
			<div class="btn-group">
				<a href="/login?app_id=sso" class="btn btn-primary">Log in</a>
				<a href="/register?app_id=sso" class="btn btn-secondary">Register</a>
			</div>
		`;
	}

	return layout(
		`Derbent`,
		html`
			<p class="lead">A derbent was a fortified pass &mdash; a narrow gate between worlds, guarded and deliberate.</p>
			<p class="lead" style="margin-bottom: 2rem;">
				Derbent stands at the boundary of your systems, verifying identity and granting passage. Nothing enters without recognition. Nothing
				passes without consent.
			</p>
			${actionArea}
		`,
	);
};
