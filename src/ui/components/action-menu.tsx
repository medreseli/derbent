import { EllipsisIcon, ExternalLinkIcon, KeySquareIcon, LogOutIcon, ShieldCheckIcon } from '../helpers/icons';
import { AppStatus } from '../pages/landing';
import { Child } from 'hono/jsx';

export interface MenuAction {
	label: string;
	href: string;
	icon: Child;
	target?: string;
}

interface ActionMenuProps {
	app: AppStatus;
	csrfToken: string;
}

export const ActionMenu = ({ app, csrfToken }: ActionMenuProps) => {
	const appId = app.config.id;
	const appUrl = app.config.url;

	const actions: MenuAction[] = [
		{
			label: 'Change Password',
			href: `/change-password?app_id=${appId}`,
			icon: <KeySquareIcon className="size-5" />,
		},
		{
			label: '2FA Settings',
			href: `/2fa/setup?app_id=${appId}`,
			icon: <ShieldCheckIcon className="size-5" />,
		},
	];

	if (appId !== 'sso') {
		actions.push({
			label: 'Open App',
			href: appUrl,
			icon: <ExternalLinkIcon className="size-5" />,
			target: '_blank',
		});
	}

	return (
		<details className="group relative">
			<summary className="flex cursor-pointer list-none items-center justify-center rounded-md border border-zinc-300 bg-white p-2 shadow-xs transition-colors group-open:bg-zinc-100 hover:bg-zinc-50 focus:outline-none">
				<EllipsisIcon className="size-5 text-zinc-600" />
			</summary>

			{/* Backdrop to close when clicking outside (mobile/desktop shim) */}
			<div
				className="fixed inset-0 z-10 hidden h-full w-full group-open:block"
				onclick="this.closest('details').removeAttribute('open')"
			></div>

			{/* Dropdown Container */}
			<div className="absolute -top-3 right-12 z-20 mt-2 w-48 origin-top-right divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5 focus:outline-none md:w-auto md:min-w-max">
				{/* Desktop Layout: Horizontal Icon Bar */}
				<div className="hidden items-center gap-1 p-1 md:flex">
					{actions.map((action) => (
						<a
							key={action.label}
							href={action.href}
							target={action.target}
							className="group/tooltip relative flex h-10 w-10 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
						>
							{action.icon}
							{/* Tooltip */}
							<span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 scale-95 rounded bg-zinc-900 px-2 py-1 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100">
								{action.label}
								<span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900"></span>
							</span>
						</a>
					))}

					<div className="mx-0.5 h-6 w-0.5 rounded-full bg-zinc-300"></div>

					{/* Logout form integrated for desktop bar */}
					<form method="post" action={`/logout?app_id=${appId}&redirect=/`} className="m-0">
						<input type="hidden" name="csrf_token" value={csrfToken} />
						<button
							type="submit"
							className="group/tooltip relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600"
						>
							<LogOutIcon className="size-5" />
							<span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 scale-95 rounded bg-red-600 px-2 py-1 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-all group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100">
								Log Out
							</span>
						</button>
					</form>
				</div>

				{/* Mobile Layout: Vertical List with Labels */}
				<div className="flex flex-col py-1 md:hidden">
					{actions.map((action) => (
						<a
							key={action.label}
							href={action.href}
							target={action.target}
							className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100"
						>
							<span className="text-zinc-600">{action.icon}</span>
							{action.label}
						</a>
					))}

					<form method="post" action={`/logout?app_id=${appId}&redirect=/`} className="m-0 border-t border-zinc-100">
						<input type="hidden" name="csrf_token" value={csrfToken} />
						<button
							type="submit"
							className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
						>
							<LogOutIcon className="size-5" />
							Log Out
						</button>
					</form>
				</div>
			</div>
		</details>
	);
};
