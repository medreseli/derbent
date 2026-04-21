import { Button } from '../components/button';

export const RegisterPage = ({
	appId,
	appName,
	redirect,
	csrfToken,
	error,
}: {
	appId: string;
	appName: string;
	redirect: string;
	csrfToken: string;
	error?: string;
}) => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return (
		<div className="px-4 py-8 sm:px-8">
			<p className="mb-8 text-center text-lg text-zinc-600">
				{appId === 'sso' ? (
					<>Create a global account to access all services</>
				) : (
					<>
						Create an account to access <span className="font-semibold text-zinc-900">{appName}</span>
					</>
				)}
			</p>

			{error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-600/20">{error}</div>}

			<form method="post" action={`/register?${qs}`} className="space-y-6">
				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Email address</label>
					<input type="email" name="email" required placeholder="name@example.com" autoFocus className="form-input mt-2 px-3" />
				</div>

				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Password</label>
					<input type="password" name="password" required placeholder="Minimum 8 characters" className="form-input mt-2 px-3" />
				</div>

				<div>
					<label className="block text-sm leading-6 font-medium text-zinc-900">Confirm password</label>
					<input type="password" name="confirmPassword" required placeholder="••••••••" className="form-input mt-2 px-3" />
				</div>

				<input type="hidden" name="csrf_token" value={csrfToken} />
				<Button type="submit" className="w-full">
					Register for {appName}
				</Button>
			</form>

			<p className="mt-8 text-center text-sm text-zinc-600">
				Already have an account?{' '}
				<a href={`/login?${qs}`} className="font-semibold text-zinc-900 hover:underline">
					Sign in
				</a>
			</p>
		</div>
	);
};
