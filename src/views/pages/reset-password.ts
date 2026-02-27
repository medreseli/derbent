import { html } from 'hono/html';
import { layout } from '../components/layout';

export const resetPasswordPage = (token: string, error?: string) => {
	return layout(
		`Set New Password`,
		html`
			<p class="subtitle">Please enter your new password below.</p>
			${error ? html`<div class="error">${error}</div>` : ''}
			<form method="POST" action="/reset-password">
				<input type="hidden" name="token" value="${token}" />
				<div class="form-group">
					<label for="password">New Password</label>
					<input type="password" id="password" name="password" required minlength="8" autofocus />
				</div>
				<div class="form-group">
					<label for="confirmPassword">Confirm New Password</label>
					<input type="password" id="confirmPassword" name="confirmPassword" required />
				</div>
				<button type="submit">Reset Password</button>
			</form>
		`,
	);
};
