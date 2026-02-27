import { html } from 'hono/html';
import { layout } from '../components/layout';

export const registerPage = (appId: string, redirect: string, error?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const action = `/register?${qs}`;
	const loginLink = `/login?${qs}`;

	const appName = appId === 'sso' ? 'Derbent' : appId;
	const subtitle =
		appId === 'sso' ? html`Create a global account to access all services` : html`Create an account to access <strong>${appId}</strong>`;

	return layout(
		`Create an account`,
		html`
			<p class="subtitle">${subtitle}</p>
			${errorHtml}
			<form method="POST" action="${action}">
				<div class="form-group">
					<label for="email">Email address</label>
					<input type="email" id="email" name="email" placeholder="name@example.com" required autofocus />
				</div>

				<div class="form-group">
					<label for="password">Password</label>
					<input type="password" id="password" name="password" placeholder="Minimum 8 characters" required />
				</div>

				<div class="form-group">
					<label for="confirmPassword">Confirm password</label>
					<input type="password" id="confirmPassword" name="confirmPassword" placeholder="••••••••" required />
				</div>

				<button type="submit">Register for ${appName}</button>
			</form>
			<p class="footer-text">Already have an account? <a href="${loginLink}">Sign in</a></p>
		`,
	);
};
