import { html } from 'hono/html';
import { layout } from '../components/layout';

export const loginPage = (
	appId: string,
	redirect: string,
	csrfToken: string,
	error?: string,
	successMsg?: string,
	githubClientId?: string,
) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const successHtml = successMsg
		? html`<div class="error" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">${successMsg}</div>`
		: '';

	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const action = `/login?${qs}`;
	const registerLink = `/register?${qs}`;
	const magicLink = `/magic-link?${qs}`;
	const githubLogin = `/auth/github?${qs}`;

	const appName = appId === 'sso' ? 'Derbent' : appId;

	return layout(
		`Welcome back`,
		html`
			<p class="subtitle">Sign in to continue to <strong>${appName}</strong></p>
			${successHtml} ${errorHtml}
			${githubClientId
				? html`
						<a
							href="${githubLogin}"
							class="btn btn-secondary"
							style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 1.5rem;"
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
								/>
							</svg>
							Continue with GitHub
						</a>
						<div style="display: flex; align-items: center; margin-bottom: 1.5rem; color: var(--text-muted); font-size: 0.8rem;">
							<hr style="flex: 1; border: 0; border-top: 1px solid var(--border);" />
							<span style="padding: 0 1rem;">OR</span>
							<hr style="flex: 1; border: 0; border-top: 1px solid var(--border);" />
						</div>
					`
				: ''}

			<form method="POST" action="${action}">
				<div class="form-group">
					<label for="email">Email address</label>
					<input type="email" id="email" name="email" placeholder="name@example.com" required autofocus />
				</div>
				<div class="form-group">
					<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
						<label for="password" style="margin-bottom: 0;">Password</label>
						<a href="/forgot-password" style="font-size: 0.8rem; color: var(--text-muted);">Forgot?</a>
					</div>
					<input type="password" id="password" name="password" placeholder="••••••••" required />
				</div>
				<input type="hidden" name="csrf_token" value="${csrfToken}" />
				<button type="submit">Sign in with Email</button>
			</form>
			<p class="footer-text" style="margin-top: 1rem; margin-bottom: 0.5rem;">Or <a href="${magicLink}">sign in with a Magic Link</a></p>
			<p class="footer-text">Don't have an account? <a href="${registerLink}">Sign up</a></p>
		`,
	);
};
