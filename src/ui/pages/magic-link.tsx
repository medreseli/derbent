import { AppId } from '../../config/apps';

export const MagicLinkPage = ({
	appId,
	redirect,
	csrfToken,
	error,
	success,
}: {
	appId: AppId;
	redirect: string;
	csrfToken: string;
	error?: string;
	success?: boolean;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	if (success) {
		return (
			<div className="px-4 text-center sm:px-12">
				<p className="mb-8 text-sm text-zinc-600">If an account exists, we've sent a magic link to your inbox.</p>
				<a href={`/login?${qs}`} className="btn btn-secondary w-full justify-center">
					Return to login
				</a>
			</div>
		);
	}

	return (
		<div className="px-4 sm:px-12">
			<p className="mb-8 text-center text-sm text-zinc-600">Enter your email and we'll send you a secure link to sign in instantly.</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action={`/magic-link?${qs}`} className="space-y-6">
				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Email address</label>
					<input type="email" name="email" required autoFocus placeholder="name@example.com" className="form-input mt-2 px-3" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<button type="submit" className="btn btn-primary w-full">
					Send Magic Link
				</button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				<a href={`/login?${qs}`} className="font-semibold text-zinc-900 hover:underline">
					Back to password login
				</a>
			</p>
		</div>
	);
};
