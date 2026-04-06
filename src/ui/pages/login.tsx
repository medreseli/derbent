import { AppId, REGISTERED_APPS } from '../../config/apps';

export const LoginPage = ({
	appId,
	redirect,
	csrfToken,
	error,
	success,
	githubClientId,
}: {
	appId: AppId;
	redirect: string;
	csrfToken: string;
	error?: string;
	success?: string;
	githubClientId?: string;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();
	const appInfo = REGISTERED_APPS[appId];
	const appName = appInfo ? appInfo.name : 'Derbent';

	return (
		<div className="px-4 sm:px-12">
			<p className="mb-8 text-center text-lg text-zinc-600">
				Sign in for <span className="font-semibold text-zinc-900">{appName}</span>
			</p>

			{success && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-600/20">{success}</div>}
			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			{githubClientId && (
				<>
					<a
						href={`/auth/github?${qs}`}
						className="btn btn-secondary mb-6 flex w-full items-center justify-center gap-3 bg-white text-zinc-900 ring-1 ring-zinc-300 ring-inset hover:bg-zinc-50"
					>
						<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
							<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.041-1.416-4.041-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
						</svg>
						Continue with GitHub
					</a>
					<div className="relative mb-6">
						<div className="absolute inset-0 flex items-center" aria-hidden="true">
							<div className="w-full border-t border-zinc-200"></div>
						</div>
						<div className="relative flex justify-center text-sm leading-6 font-medium">
							<span className="bg-white px-6 text-zinc-900">Or continue with email</span>
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
				<button type="submit" className="btn btn-primary w-full">
					Sign in
				</button>
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
