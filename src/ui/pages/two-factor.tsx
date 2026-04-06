import QRCode from 'qrcode-svg';

export const TwoFactorSetupPage = ({
	csrfToken,
	secret,
	email,
	error,
}: {
	csrfToken: string;
	secret: string;
	email: string;
	error?: string;
}) => {
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

	return (
		<>
			<h2 className="mb-2 text-center text-xl font-bold tracking-tight text-zinc-900">Set up Two-Factor Authentication</h2>
			<p className="mb-8 text-center text-sm text-zinc-600">Scan the QR code with your authenticator app.</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<div className="mb-8 flex flex-col items-center gap-5 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6">
				<div className="rounded-lg border border-zinc-200 bg-white p-2 shadow-sm" dangerouslySetInnerHTML={{ __html: qrSvg }} />

				<div className="w-full text-center">
					<p className="mb-2 text-xs text-zinc-500">Or manually enter the secret:</p>
					<div className="rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm font-bold tracking-widest text-zinc-900">
						{formattedSecret}
					</div>
				</div>
			</div>

			<form method="post" action="/2fa/setup" className="space-y-6">
				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Enter the 6-digit code from your app</label>
					<input
						type="text"
						name="code"
						placeholder="123456"
						required
						autoComplete="off"
						pattern="[0-9]{6}"
						maxLength={6}
						autoFocus
						className="form-input mt-2 text-center tracking-widest"
					/>
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<button type="submit" className="btn btn-primary w-full">
					Verify and Enable
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				<a href="/" className="font-semibold text-zinc-900 hover:underline">
					Cancel
				</a>
			</p>
		</>
	);
};

export const TwoFactorManagePage = ({ csrfToken, isEnabled, error }: { csrfToken: string; isEnabled: boolean; error?: string }) => {
	if (!isEnabled) {
		return (
			<div className="text-center">
				<p>Redirecting...</p>
				<script dangerouslySetInnerHTML={{ __html: "window.location = '/2fa/setup';" }} />
			</div>
		);
	}

	return (
		<div className="px-4 sm:px-12">
			<h2 className="mb-2 text-center text-xl font-bold tracking-tight text-zinc-900">Manage Two-Factor Authentication</h2>
			<p className="mb-8 text-center text-sm text-zinc-600">
				Two-Factor Authentication is currently <strong className="text-green-600">Enabled</strong>.
			</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action="/2fa/disable" className="space-y-6 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
				<p className="text-sm text-zinc-600">To disable 2FA, please enter a code from your authenticator app.</p>

				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Authenticator Code</label>
					<input
						type="text"
						name="code"
						placeholder="123456"
						required
						autoComplete="off"
						pattern="[0-9]{6}"
						maxLength={6}
						autoFocus
						className="form-input mt-2 px-3 text-center tracking-widest"
					/>
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<button type="submit" className="btn btn-danger w-full">
					Disable 2FA
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				<a href="/" className="font-semibold text-zinc-900 hover:underline">
					Back to Dashboard
				</a>
			</p>
		</div>
	);
};
