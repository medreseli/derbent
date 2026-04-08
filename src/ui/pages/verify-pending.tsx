import { Button } from '../components/button';

export const VerifyPendingPage = ({ appId = 'sso', redirect = '/' }: { appId?: string; redirect?: string }) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return (
		<div className="px-4 text-center sm:px-12">
			<h2 className="mb-4 text-xl font-bold tracking-tight text-zinc-900">Check your inbox</h2>
			<p className="mb-2 text-sm text-zinc-600">
				We've sent a verification link to your email address. Please click the link to activate your account.
			</p>
			<p className="mb-8 text-sm text-zinc-500">The link will expire in 15 minutes.</p>

			<Button href={`/login?${qs}`} variant="secondary" className="w-full justify-center">
				Return to login
			</Button>
		</div>
	);
};
