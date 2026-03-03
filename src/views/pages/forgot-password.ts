import { html } from 'hono/html';
import { layout } from '../components/layout';

export const forgotPasswordPage = (csrfToken: string, appId: string, redirect: string, error?: string, success?: boolean) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const action = `/forgot-password?${qs}`;
	const loginLink = `/login?${qs}`;

	const content = success
		? html`
				<p class="lead">If an account exists for that email, we've sent reset instructions to your inbox.</p>
				<div class="btn-group">
					<a href="${loginLink}" class="btn btn-secondary">Return to login</a>
				</div>
			`
		: html`
				<p class="subtitle">Enter your email and we'll send you a link to reset your password.</p>
				${error ? html`<div class="error">${error}</div>` : ''}
				<form method="POST" action="${action}">
					<div class="form-group">
						<label for="email">Email address</label>
						<input type="email" id="email" name="email" required autofocus />
					</div>
					<input type="hidden" name="csrf_token" value="${csrfToken}" />
					<button type="submit">Send Reset Link</button>
				</form>
				<p class="footer-text"><a href="${loginLink}">Back to login</a></p>
			`;

	return layout(`Forgot Password`, content);
};
