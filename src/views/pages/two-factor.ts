import { html, raw } from 'hono/html';
import { layout } from '../components/layout';
import QRCode from 'qrcode-svg';

export const twoFactorSetupPage = (csrfToken: string, secret: string, email: string, error?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';
	const formattedSecret = secret.match(/.{1,4}/g)?.join(' ') || secret;
	const otpauthUrl = `otpauth://totp/Derbent:${encodeURIComponent(email)}?secret=${secret}&issuer=Derbent`;

	const qrSvg = new QRCode({
		content: otpauthUrl,
		padding: 2,
		width: 200,
		height: 200,
		color: '#18181b',
		background: '#ffffff',
		ecl: 'M',
	}).svg();

	return layout(
		`Set up Two-Factor Authentication`,
		html`
			<p class="subtitle">Scan the QR code with your authenticator app.</p>
			${errorHtml}

			<div
				style="background: #fff; padding: 1.5rem; border: 1px solid var(--border); border-radius: 8px; text-align: center; margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1.25rem;"
			>
				<div
					style="background: #fff; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border); display: inline-flex; box-shadow: 0 1px 3px rgba(0,0,0,0.05);"
				>
					${raw(qrSvg)}
				</div>

				<div style="width: 100%;">
					<p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 0.5rem;">Or manually enter the secret:</p>
					<div
						style="font-family: monospace; font-size: 1.125rem; font-weight: bold; letter-spacing: 0.1em; background: var(--bg); padding: 0.75rem; border-radius: 6px;"
					>
						${formattedSecret}
					</div>
				</div>
			</div>

			<form method="POST" action="/2fa/setup">
				<div class="form-group">
					<label for="code">Enter the 6-digit code from your app</label>
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
				<button type="submit">Verify and Enable</button>
			</form>
			<p class="footer-text"><a href="/">Cancel</a></p>
		`,
	);
};

export const twoFactorManagePage = (csrfToken: string, isEnabled: boolean, error?: string) => {
	const errorHtml = error ? html`<div class="error">${error}</div>` : '';

	if (isEnabled) {
		return layout(
			`Manage Two-Factor Authentication`,
			html`
				<p class="subtitle">Two-Factor Authentication is currently <strong style="color: var(--success-text);">Enabled</strong>.</p>
				${errorHtml}
				<form method="POST" action="/2fa/disable" style="margin-top: 1.5rem;">
					<p style="font-size: 0.875rem; margin-bottom: 1rem;">To disable 2FA, please enter a code from your authenticator app.</p>
					<div class="form-group">
						<label for="code">Authenticator Code</label>
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
					<button type="submit" class="btn-danger" style="width: 100%;">Disable 2FA</button>
				</form>
				<p class="footer-text"><a href="/">Back to Dashboard</a></p>
			`,
		);
	}

	return layout(
		'Manage 2FA',
		html`<p>Redirecting...</p>
			<script>
				window.location = '/2fa/setup';
			</script>`,
	);
};
