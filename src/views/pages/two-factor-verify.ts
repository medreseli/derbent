import { html } from 'hono/html';
import { layout } from '../components/layout';

export const twoFactorVerifyPage = (appName: string, token: string, appId: string, redirect: string, csrfToken: string, error?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return layout(
		`Two-Factor Authentication`,
		html`
			<p class="subtitle">Enter the code from your authenticator app to continue to <strong>${appName}</strong>.</p>
			${errorHtml}
			<form method="POST" action="/2fa/verify?${qs}">
				<input type="hidden" name="token" value="${token}" />
				<div class="form-group">
					<label for="code">6-digit Code</label>
					<input
						type="text"
						id="code"
						name="code"
						placeholder="123456"
						required
						autocomplete="off"
						pattern="[0-9]{6}"
						maxlength="6"
						autofocus
					/>
				</div>
				<input type="hidden" name="csrf_token" value="${csrfToken}" />
				<button type="submit">Verify</button>
			</form>
			<p class="footer-text"><a href="/login?${qs}">Back to login</a></p>
		`,
	);
};
