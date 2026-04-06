export const ResetPasswordPage = ({ token, csrfToken, error }: { token: string; csrfToken: string; error?: string }) => {
	return (
		<>
			<p className="mb-8 text-center text-sm text-zinc-600">Please enter your new password below.</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action="/reset-password" className="space-y-6">
				<input type="hidden" name="token" value={token} />

				<div>
					<label className="block text-sm font-medium leading-6 text-zinc-900">New Password</label>
					<input type="password" name="password" required minLength={8} autoFocus className="form-input mt-2" />
				</div>

				<div>
					<label className="block text-sm font-medium leading-6 text-zinc-900">Confirm New Password</label>
					<input type="password" name="confirmPassword" required className="form-input mt-2" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<button type="submit" className="btn btn-primary w-full">
					Reset Password
				</button>
			</form>
		</>
	);
};
