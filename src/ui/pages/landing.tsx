import { Session } from '../../types/session';
import { AppIcon } from '../components/app-icon';
import { KeySquareIcon, LogInIcon, LogOutIcon, ShieldCheckIcon } from '../helpers/icons';

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

// --- SUB-COMPONENTS ---

const SuccessMessage = ({ message }: { message: string }) => (
	<div className="mb-6 bg-green-50 p-3 text-sm text-green-800 ring-1 ring-green-600/20">{message}</div>
);

const SsoActiveAppList = ({ ssoApp, regularApps }: { ssoApp: AppStatus; regularApps: AppStatus[] }) => (
	<div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
		<div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4">
			<h3 className="flex items-center gap-3 font-semibold text-zinc-900">
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-xs ring-1 ring-zinc-200">
					<img src={ssoApp.config.icon} alt="" className="h-5 w-5" />
				</div>
				Global SSO Active
			</h3>
			<p className="mt-1 text-sm text-zinc-600">
				You are securely logged in as <strong className="text-zinc-900">{ssoApp.session!.email}</strong>.
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
);

const IndividualAppList = ({ apps, csrfToken }: { apps: AppStatus[]; csrfToken: string }) => (
	<ul className="flex flex-col gap-2 overflow-hidden bg-white py-1">
		{apps.map((app) => {
			const isLoggedIn = app.session !== null;
			return (
				<li key={app.config.id} className="flex w-full items-center">
					<div className="flex-1 text-sm font-medium whitespace-nowrap text-zinc-900 sm:pl-6">
						<div className="flex items-center gap-2">
							<AppIcon appId={app.config.id} className="size-6 text-zinc-800" />
							{app.config.name}
						</div>
					</div>

					<div className="w-44 truncate text-sm whitespace-nowrap text-zinc-500">{isLoggedIn ? app.session!.email : '-'}</div>

					<div className="relative text-right text-sm font-medium whitespace-nowrap sm:pr-6">
						{isLoggedIn ? (
							<div className="flex items-center justify-end gap-3">
								<a href={app.config.url} target="_blank" className="font-semibold text-zinc-600 hover:text-zinc-900">
									Open
								</a>
								<form method="post" action={`/logout?app_id=${app.config.id}&redirect=/`} className="m-0">
									<input type="hidden" name="csrf_token" value={csrfToken} />
									<button type="submit" className="font-semibold text-red-600 hover:text-red-900">
										<LogOutIcon />
									</button>
								</form>
							</div>
						) : (
							<a
								href={`/login?app_id=${app.config.id}&redirect=/`}
								className="flex h-8 items-center justify-center rounded-lg border border-zinc-500/50 bg-emerald-300 px-4 py-1 font-semibold shadow-xs hover:bg-emerald-400"
							>
								<LogInIcon className="size-5 text-zinc-600" />
							</a>
						)}
					</div>
				</li>
			);
		})}
	</ul>
);

// --- MAIN PAGE COMPONENT ---

export const LandingPage = ({
	csrfToken,
	apps,
	hasAnySession,
	successMsg,
}: {
	csrfToken: string;
	apps: AppStatus[];
	hasAnySession: boolean;
	successMsg?: string;
}) => {
	const ssoApp = apps.find((a) => a.config.id === 'sso');
	const regularApps = apps.filter((a) => a.config.id !== 'sso');
	const isSsoActive = ssoApp && ssoApp.session !== null;
	const activeSessions = apps.filter((a) => a.session !== null);

	const defaultAppId = isSsoActive ? 'sso' : activeSessions[0]?.config.id || 'sso';

	return (
		<div className="">
			<p className="mb-8 text-center text-sm text-zinc-600">Manage your identity and access across our applications.</p>

			{successMsg && <SuccessMessage message={successMsg} />}

			{isSsoActive ? (
				<SsoActiveAppList ssoApp={ssoApp} regularApps={regularApps} />
			) : (
				<IndividualAppList apps={apps} csrfToken={csrfToken} />
			)}

			<hr className="mx-2 my-4 border-zinc-300" />

			{hasAnySession && (
				<div className="relative flex w-full items-center justify-end px-8" id="settings-menu-container">
					<div className="relative inline-block text-left">
						{/* Dropdown Menu */}
						<div
							id="settings-dropdown"
							className="absolute right-0 bottom-full z-10 mb-2 hidden w-64 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-zinc-200 focus:outline-none"
						>
							{activeSessions.length > 1 && !isSsoActive && (
								<div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3">
									<label className="mb-1 block text-xs font-medium text-zinc-500">Working on account</label>
									<select
										id="settings-account-select"
										className="block w-full cursor-pointer rounded-md border-zinc-300 bg-white py-1.5 pr-8 pl-2 text-sm shadow-sm focus:border-zinc-900 focus:ring-zinc-900"
									>
										{activeSessions.map((app) => (
											<option key={app.config.id} value={app.config.id}>
												{app.config.name} - {app.session?.email}
											</option>
										))}
									</select>
								</div>
							)}
							<div className="p-1">
								<a
									id="settings-link-pwd"
									href={`/change-password?app_id=${defaultAppId}`}
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
								>
									<KeySquareIcon className="size-5" />
									Change password
								</a>
								<a
									id="settings-link-2fa"
									href={`/2fa/setup?app_id=${defaultAppId}`}
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
								>
									<ShieldCheckIcon className="size-5" />
									Manage 2FA
								</a>
							</div>
							<div className="border-t border-zinc-100 p-1">
								<form method="post" action="/logout-all-email?redirect=/" className="m-0">
									<input type="hidden" name="csrf_token" value={csrfToken} />
									<button
										type="submit"
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
									>
										<LogOutIcon className="size-5" />
										Log out everywhere
									</button>
								</form>
							</div>
						</div>

						{/* Settings Trigger Button */}
						<button
							id="settings-btn"
							className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
						>
							<svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								/>
								<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Settings
						</button>
					</div>
				</div>
			)}

			{hasAnySession && (
				<script
					dangerouslySetInnerHTML={{
						__html: `
							document.getElementById('settings-btn')?.addEventListener('click', () => {
								document.getElementById('settings-dropdown')?.classList.toggle('hidden');
							});
							document.addEventListener('click', (e) => {
								if (!e.target.closest('#settings-menu-container')) {
									document.getElementById('settings-dropdown')?.classList.add('hidden');
								}
							});
							document.getElementById('settings-account-select')?.addEventListener('change', (e) => {
								const appId = e.target.value;
								const pwd = document.getElementById('settings-link-pwd');
								const tfa = document.getElementById('settings-link-2fa');
								if (pwd) pwd.href = '/change-password?app_id=' + appId;
								if (tfa) tfa.href = '/2fa/setup?app_id=' + appId;
							});
						`,
					}}
				/>
			)}
		</div>
	);
};
