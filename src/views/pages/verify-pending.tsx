export const VerifyPendingPage = ({ appId = 'sso', redirect = '/' }: { appId?: string; redirect?: string }) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return (
		<div className="text-center">
			<h2 className="text-xl font-bold tracking-tight text-zinc-900 mb-4">Check your inbox</h2>
			<p className="mb-2 text-sm text-zinc-600">
				We've sent a verification link to your email address. Please click the link to activate your account.
			</p>
			<p className="mb-8 text-sm text-zinc-500">The link will expire in 15 minutes.</p>

			<a href={`/login?${qs}`} className="btn btn-secondary w-full justify-center">
				Return to login
			</a>
		</div>
	);
};
