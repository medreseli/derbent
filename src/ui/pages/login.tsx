import { GithubIcon, GoogleIcon } from '../helpers/icons';
import { Button } from '../components/button';

export const LoginPage = ({
	appId,
	appName,
	redirect,
	csrfToken,
	error,
	success,
	githubClientId,
	googleClientId,
}: {
	appId: string;
	appName: string;
	redirect: string;
	csrfToken: string;
	error?: string;
	success?: string;
	githubClientId?: string;
	googleClientId?: string;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return (
		<div className="px-4 py-8 sm:px-8">
			<p className="mb-8 text-center text-lg text-zinc-600">
				Sign in for <span className="font-semibold text-zinc-900">{appName}</span>
			</p>

			{success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-600/20">{success}</div>}
			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			{(githubClientId || googleClientId) && (
				<>
					<div className="mb-6 flex gap-3">
						{googleClientId && (
							<Button href={`/auth/google?${qs}`} variant="secondary" className="flex w-full items-center justify-center gap-3">
								<GoogleIcon />
								Google
							</Button>
						)}
						{githubClientId && (
							<Button href={`/auth/github?${qs}`} variant="secondary" className="flex w-full items-center justify-center gap-3">
								<GithubIcon />
								GitHub
							</Button>
						)}
					</div>

					<div className="relative mb-6">
						<div className="absolute inset-0 flex items-center" aria-hidden="true">
							<div className="w-full border-t border-zinc-200"></div>
						</div>
						<div className="relative flex justify-center text-sm leading-6 font-medium">
							<span className="bg-white px-6 text-zinc-900">or</span>
						</div>
					</div>
				</>
			)}

			<form method="post" action={`/login?${qs}`} className="space-y-6">
				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Email address</label>
					<input type="email" name="email" required placeholder="name@example.com" autoFocus className="form-input mt-2 px-3" />
				</div>

				<div>
					<div className="flex items-center justify-between">
						<label className="block text-sm leading-6 font-medium text-zinc-900">Password</label>
						<a href={`/forgot-password?${qs}`} className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:underline">
							Forgot password?
						</a>
					</div>
					<input type="password" name="password" required placeholder="••••••••" className="form-input mt-2 px-3" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<Button type="submit" className="w-full">
					Sign in
				</Button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				Or{' '}
				<a href={`/magic-link?${qs}`} className="font-semibold text-zinc-900 hover:underline">
					sign in with a Magic Link
				</a>
			</p>
			<p className="mt-2 text-center text-sm text-zinc-600">
				Don't have an account?{' '}
				<a href={`/register?${qs}`} className="font-semibold text-zinc-900 hover:underline">
					Sign up
				</a>
			</p>
		</div>
	);
};
