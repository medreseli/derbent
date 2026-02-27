import { html } from 'hono/html';
import { layout } from '../components/layout';

export const loginPage = (appId: string, redirect: string, error?: string, successMsg?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const successHtml = successMsg
		? html`<div class="error" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">${successMsg}</div>`
		: '';

	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const action = `/login?${qs}`;
	const registerLink = `/register?${qs}`;

	const appName = appId === 'sso' ? 'Derbent' : appId;
	const subtitle =
		appId === 'sso' ? html`Enter your credentials to access your account` : html`Sign in to continue to <strong>${appId}</strong>`;

	return layout(
		`Welcome back`,
		html`
			<p class="subtitle">${subtitle}</p>
			${successHtml} ${errorHtml}
			<form method="POST" action="${action}">
				<div class="form-group">
					<label for="email">Email address</label>
					<input type="email" id="email" name="email" placeholder="name@example.com" required autofocus />
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input type="password" id="password" name="password" placeholder="••••••••" required />
				</div>

				<button type="submit">Sign in to ${appName}</button>
			</form>
			<p class="footer-text">Don't have an account? <a href="${registerLink}">Sign up</a></p>
		`,
	);
};
