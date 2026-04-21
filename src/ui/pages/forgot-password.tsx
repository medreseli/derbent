import { Button } from '../components/button';

export const ForgotPasswordPage = ({
	csrfToken,
	appId,
	redirect,
	error,
	success,
}: {
	csrfToken: string;
	appId: string;
	redirect: string;
	error?: string;
	success?: boolean;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	if (success) {
		return (
			<div className="px-4 py-8 text-center">
				<p className="mb-8 text-sm text-zinc-600">If an account exists for that email, we've sent reset instructions to your inbox.</p>
				<Button href={`/login?${qs}`} variant="secondary" className="w-full justify-center">
					Return to login
				</Button>
			</div>
		);
	}

	return (
		<div className="px-4 py-8 sm:px-8">
			<p className="mb-8 text-center text-base text-zinc-600">Enter your email and we'll send you a link to reset your password.</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action={`/forgot-password?${qs}`} className="space-y-6">
				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Email address</label>
					<input type="email" name="email" required autoFocus className="form-input mt-2 px-3" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<Button type="submit" className="w-full">
					Send Reset Link
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
