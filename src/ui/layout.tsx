import { jsxRenderer } from 'hono/jsx-renderer';
import { AppIcon } from './components/app-icon';

export const renderer = jsxRenderer(({ children }) => {
	// In development, Vite processes /src/app.css dynamically via the plugin.
	// In production, we load the statically built /main.css from the public/ folder.
	const cssPath = import.meta.env.PROD ? '/main.css' : '/src/style.css';

	return (
		<html lang="en" className="h-full bg-zinc-50">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Derbent</title>
				<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
				<link rel="stylesheet" href={cssPath} />
			</head>

			<body className="h-full font-sans text-zinc-900 antialiased select-none">
				<div className="flex min-h-full flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
					<div className="relative aspect-82/48 h-32">
						<svg className="absolute inset-0 h-full w-full text-gray-700" viewBox="0 0 82 48" preserveAspectRatio="none">
							<defs>
								<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
									<feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3" />
								</filter>
							</defs>

							<path
								fill="currentColor"
								d="M39.775 0C34.515 0.17 29.322 1.77 25.063 5.08C15.329 12.64 18.637 23.35 14.06 33.77C9.482 44.19 0 48 0 48h82s-9.482-3.81-14.06-14.23C63.363 23.35 66.671 12.64 56.937 5.08C52.678 1.77 47.485 0.17 42.225 0c-.408-.013-.816.005-1.225.01-.409-.005-.817-.023-1.225-.01z"
							/>
						</svg>

						<div className="relative flex h-full flex-col items-center justify-center gap-1.5 text-zinc-200">
							<a href="/">
								<AppIcon appId="sso" className="size-12" />
							</a>
							<h1 className="text-center text-xl font-bold tracking-tight">DERBENT</h1>
						</div>
					</div>

					<div className="sm:mx-auto sm:w-full sm:max-w-md">
						<div className="bg-white py-8 shadow-xs ring-1 ring-gray-700 sm:rounded-lg">{children}</div>
					</div>
				</div>
			</body>
		</html>
	);
});
