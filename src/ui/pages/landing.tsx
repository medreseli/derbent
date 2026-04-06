import { Session } from '../../types/session';
import { AppIcon } from '../components/app-icon';

export interface AppViewConfig {
	id: string;
	name: string;
	description: string;
	icon: string;
	url: string;
}

export interface AppStatus {
	config: AppViewConfig;
	session: Session | null;
	isSsoFallback: boolean;
}

export const LandingPage = ({
	appName,
	csrfToken,
	apps,
	hasAnySession,
	successMsg,
}: {
	appName: string;
	csrfToken: string;
	apps: AppStatus[];
	hasAnySession: boolean;
	successMsg?: string;
}) => {
	const ssoApp = apps.find((a) => a.config.id === 'sso');
	const regularApps = apps.filter((a) => a.config.id !== 'sso');
	const isSsoActive = ssoApp && ssoApp.session !== null;

	return (
		<>
			<p className="mb-8 text-center text-sm text-zinc-600">Manage your identity and access across our applications.</p>

			{successMsg && <div className="mb-6 rounded-md bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-600/20">{successMsg}</div>}

			{hasAnySession && (
				<div className="mb-8 flex flex-col items-center justify-between gap-4 rounded-lg bg-zinc-50 p-4 ring-1 ring-zinc-200 sm:flex-row">
					<div className="flex gap-4">
						<a href="/change-password" className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline">
							Change Password
						</a>
						<a href="/2fa/setup" className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline">
							Manage 2FA
						</a>
					</div>
					<div className="flex gap-4 border-t border-zinc-200 pt-4 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
						<form method="post" action="/logout?app_id=sso&redirect=/">
							<input type="hidden" name="csrf_token" value={csrfToken} />
							<button type="submit" className="text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:underline">
								Log out
							</button>
						</form>
						<form method="post" action="/logout-all-email?app_id=sso&redirect=/">
							<input type="hidden" name="csrf_token" value={csrfToken} />
							<button type="submit" className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline">
								Log out everywhere
							</button>
						</form>
					</div>
				</div>
			)}

			{isSsoActive ? (
				<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
					<div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
						<h3 className="flex items-center gap-3 font-semibold text-zinc-900">
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-xs ring-1 ring-zinc-200">
								<img src={ssoApp!.config.icon} alt="" className="h-5 w-5" />
							</div>
							Global SSO Active
						</h3>
						<p className="mt-1 text-sm text-zinc-600">
							You are securely logged in as <strong className="text-zinc-900">{ssoApp!.session!.email}</strong>.
						</p>
					</div>
					<ul className="divide-y divide-zinc-100">
						{regularApps.map((app) => (
							<li key={app.config.id}>
								<a
									href={app.config.url}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-zinc-50"
								>
									<div className="flex items-center gap-4">
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 shadow-xs ring-1 ring-zinc-200">
											<img src={app.config.icon} alt="" className="h-7 w-7" />
										</div>
										<span className="font-medium text-zinc-900">{app.config.name}</span>
									</div>
									<svg
										width="16"
										height="16"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										className="text-zinc-400"
									>
										<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
										<polyline points="15 3 21 3 21 9"></polyline>
										<line x1="10" y1="14" x2="21" y2="3"></line>
									</svg>
								</a>
							</li>
						))}
					</ul>
				</div>
			) : (
				<div className="overflow-hidden bg-white">
					<table className="min-w-full divide-y divide-zinc-200">
						<thead className="bg-zinc-50">
							<tr>
								<th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-zinc-900 sm:pl-6">
									Application
								</th>
								<th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-zinc-900">
									Signed in as
								</th>
								<th scope="col" className="relative py-3.5 pr-4 pl-3 sm:pr-6">
									<span className="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-zinc-200 bg-white">
							{apps.map((app) => {
								const isLoggedIn = app.session !== null;
								return (
									<tr key={app.config.id}>
										<td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-zinc-900 sm:pl-6">
											<div className="flex items-center gap-4">
												<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-50 shadow-xs ring-1 ring-zinc-200">
													<AppIcon appId={app.config.id} className="h-7 w-7 text-zinc-800" />
												</div>
												{app.config.name}
											</div>
										</td>
										<td className="px-3 py-4 text-sm whitespace-nowrap text-zinc-500">{isLoggedIn ? app.session!.email : '-'}</td>
										<td className="relative py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6">
											{isLoggedIn ? (
												<div className="flex items-center justify-end gap-3">
													<a href={app.config.url} target="_blank" className="font-semibold text-zinc-600 hover:text-zinc-900">
														Open
													</a>
													<form method="post" action={`/logout?app_id=${app.config.id}&redirect=/`} className="m-0">
														<input type="hidden" name="csrf_token" value={csrfToken} />
														<button type="submit" className="font-semibold text-red-600 hover:text-red-900">
															Log out
														</button>
													</form>
												</div>
											) : (
												<a
													href={`/login?app_id=${app.config.id}&redirect=/`}
													className="font-semibold text-indigo-600 hover:text-indigo-900"
												>
													Log in
												</a>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
};
