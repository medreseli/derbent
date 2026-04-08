import { AppId } from '../../config/apps';
import { Button } from '../components/button';

export const TwoFactorVerifyPage = ({
	appName,
	token,
	appId,
	redirect,
	csrfToken,
	error,
}: {
	appName: string;
	token: string;
	appId: AppId;
	redirect: string;
	csrfToken: string;
	error?: string;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return (
		<div className="px-4 sm:px-12">
			<h2 className="mb-2 text-center text-xl font-bold tracking-tight text-zinc-900">Two-Factor Authentication</h2>
			<p className="mb-8 text-center text-sm text-zinc-600">
				Enter the code from your authenticator app to continue to <strong className="text-zinc-900">{appName}</strong>.
			</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action={`/2fa/verify?${qs}`} className="space-y-6">
				<input type="hidden" name="token" value={token} />

				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">6-digit Code</label>
					<input
						type="text"
						name="code"
						placeholder="123456"
						required
						autoComplete="off"
						pattern="[0-9]{6}"
						maxLength={6}
						autoFocus
						className="form-input mt-2 px-3 text-center text-lg tracking-widest"
					/>
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<Button type="submit" className="w-full">
					Verify
				</Button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				<a href={`/login?${qs}`} className="font-semibold text-zinc-900 hover:underline">
					Back to login
				</a>
			</p>
		</div>
	);
};
