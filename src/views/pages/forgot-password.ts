import { html } from 'hono/html';
import { layout } from '../components/layout';

export const forgotPasswordPage = (csrfToken: string, error?: string, success?: boolean) => {
	const content = success
		? html`<p class="lead">If an account exists for that email, we've sent reset instructions to your inbox.</p>`
		: html`
				<p class="subtitle">Enter your email and we'll send you a link to reset your password.</p>
				${error ? html`<div class="error">${error}</div>` : ''}
				<form method="POST" action="/forgot-password">
					<div class="form-group">
						<label for="email">Email address</label>
						<input type="email" id="email" name="email" required autofocus />
					</div>
					<input type="hidden" name="csrf_token" value="${csrfToken}" />
					<button type="submit">Send Reset Link</button>
				</form>
			`;

	return layout(`Forgot Password`, content);
};
