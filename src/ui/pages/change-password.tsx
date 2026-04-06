export const ChangePasswordPage = ({ csrfToken, error, success }: { csrfToken: string; error?: string; success?: string }) => {
	return (
		<>
			<p className="mb-8 text-center text-sm text-zinc-600">Update your password to keep your account secure.</p>

			{success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-600/20">{success}</div>}
			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action="/change-password" className="space-y-6">
				<div>
					<label className="block text-sm font-medium leading-6 text-zinc-900">Current Password</label>
					<input type="password" name="currentPassword" required autoFocus className="form-input mt-2" />
				</div>

				<div>
					<label className="block text-sm font-medium leading-6 text-zinc-900">New Password</label>
					<input type="password" name="newPassword" required minLength={8} placeholder="Minimum 8 characters" className="form-input mt-2" />
				</div>

				<div>
					<label className="block text-sm font-medium leading-6 text-zinc-900">Confirm New Password</label>
					<input type="password" name="confirmNewPassword" required className="form-input mt-2" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<button type="submit" className="btn btn-primary w-full">
					Update Password
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				<a href="/" className="font-semibold text-zinc-900 hover:underline">
					Back to Dashboard
				</a>
			</p>
		</>
	);
};
