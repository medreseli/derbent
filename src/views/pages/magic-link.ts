import { html } from 'hono/html';
import { layout } from '../components/layout';

export const magicLinkPage = (appId: string, redirect: string, csrfToken: string, error?: string, success?: boolean) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const loginLink = `/login?${qs}`;

	const content = success
		? html`
				<p class="lead">If an account exists, we've sent a magic link to your inbox.</p>
				<div class="btn-group">
					<a href="${loginLink}" class="btn btn-secondary">Return to login</a>
				</div>
			`
		: html`
				<p class="subtitle">Enter your email and we'll send you a secure link to sign in instantly.</p>
				${error ? html`<div class="error">${error}</div>` : ''}
				<form method="POST" action="/magic-link?${qs}">
					<div class="form-group">
						<label for="email">Email address</label>
						<input type="email" id="email" name="email" required autofocus placeholder="name@example.com" />
					</div>
					<input type="hidden" name="csrf_token" value="${csrfToken}" />
					<button type="submit">Send Magic Link</button>
				</form>
				<p class="footer-text"><a href="${loginLink}">Back to password login</a></p>
			`;

	return layout(`Sign in with Magic Link`, content);
};
