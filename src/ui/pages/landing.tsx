import { Session } from '../../types/session';
import { ActionMenu } from '../components/action-menu';
import { AppIcon } from '../components/app-icon';
import { Button } from '../components/button';
import { ExternalLinkIcon, LogInIcon } from '../helpers/icons';

export interface AppViewConfig {
	id: string;
	name: string;
	description: string;
	icon: string | null;
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

const AppListRow = ({
	app,
	csrfToken,
	isLoggedInAsSSO,
	isThisRowSSO,
}: {
	app: AppStatus;
	csrfToken: string;
	isLoggedInAsSSO: boolean;
	isThisRowSSO: boolean;
}) => {
	const isLoggedIn = app.session !== null;

	return (
		<div className={`group relative flex items-center justify-between p-4 transition-all ${isLoggedIn ? 'bg-white/2' : 'opacity-80'}`}>
			<div className="flex items-center gap-4">
				<div
					className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all ${
						isLoggedIn ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-zinc-300 bg-zinc-100'
					}`}
				>
					<AppIcon iconSvg={app.config.icon} className={`size-8 ${isLoggedIn ? 'text-emerald-700' : 'text-zinc-800'}`} />
					{isLoggedIn && (
						<span className="absolute -top-1 -right-1 flex h-3 w-3">
							<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
							<span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
						</span>
					)}
				</div>

				<div>
					<div className="flex items-center gap-2">
						<span className={`font-semibold ${isLoggedIn ? 'text-zinc-900' : 'text-zinc-700'}`}>{app.config.name}</span>
						{isThisRowSSO && (
							<span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-700 uppercase">
								SSO
							</span>
						)}
					</div>
					<p className="text-xs text-zinc-600">
						{isLoggedIn ? app.session!.email : app.config.description || 'Sign in to access application'}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				{isThisRowSSO && isLoggedInAsSSO && <ActionMenu app={app} csrfToken={csrfToken} />}
				{!isThisRowSSO && !isLoggedInAsSSO && isLoggedIn && <ActionMenu app={app} csrfToken={csrfToken} />}

				{!isThisRowSSO && isLoggedInAsSSO && isLoggedIn && (
					<a
						href={app.config.url}
						target="_blank"
						className="group/tooltip relative flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
					>
						<ExternalLinkIcon className="size-5" />
						{/* Tooltip */}
						<span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 scale-95 rounded bg-zinc-900 px-2 py-1 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100">
							{app.config.name}
							<span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></span>
						</span>
					</a>
				)}

				{!isLoggedIn && (
					<Button
						href={`/login?app_id=${app.config.id}&redirect=/`}
						variant="primary"
						className="flex h-9 w-24 items-center rounded-md px-2 shadow"
					>
						<LogInIcon className="mr-2 size-4" /> Sign In
					</Button>
				)}
			</div>
		</div>
	);
};

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
	const isLoggedInAsSSO = !!ssoApp?.session;

	return (
		<div className="">
			<p className="mb-8 pt-8 text-center text-base text-zinc-600">
				Manage your identity and access <br /> across our applications.
			</p>

			{successMsg && <SuccessMessage message={successMsg} />}

			<div className="divide-y divide-zinc-200">
				{/* Render SSO app at top if it exists */}
				{ssoApp && <AppListRow app={ssoApp} csrfToken={csrfToken} isLoggedInAsSSO={isLoggedInAsSSO} isThisRowSSO={true} />}

				{/* Render regular apps */}
				{regularApps.map((app) => (
					<AppListRow key={app.config.id} app={app} csrfToken={csrfToken} isLoggedInAsSSO={isLoggedInAsSSO} isThisRowSSO={false} />
				))}
			</div>
		</div>
	);
};
