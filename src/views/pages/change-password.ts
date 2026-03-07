import { html } from 'hono/html';
import { layout } from '../components/layout';

export const changePasswordPage = (csrfToken: string, error?: string, success?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const successHtml = success
		? html`<div class="error" style="background: #f0fdf4; color: #166534; border-color: #bbf7d0;">${success}</div>`
		: '';

	return layout(
		`Change Password`,
		html`
			<p class="subtitle">Update your password to keep your account secure.</p>
			${errorHtml} ${successHtml}
			<form method="POST" action="/change-password">
				<div class="form-group">
					<label for="currentPassword">Current Password</label>
					<input type="password" id="currentPassword" name="currentPassword" required autofocus />
				</div>
				<div class="form-group">
					<label for="newPassword">New Password</label>
					<input type="password" id="newPassword" name="newPassword" placeholder="Minimum 8 characters" required minlength="8" />
				</div>
				<div class="form-group">
					<label for="confirmNewPassword">Confirm New Password</label>
					<input type="password" id="confirmNewPassword" name="confirmNewPassword" required />
				</div>
				<input type="hidden" name="csrf_token" value="${csrfToken}" />
				<button type="submit">Update Password</button>
			</form>
			<p class="footer-text"><a href="/">Back to Dashboard</a></p>
		`,
	);
};
