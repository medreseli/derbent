import { jsxRenderer } from 'hono/jsx-renderer';

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
			<body className="h-full font-sans antialiased text-zinc-900">
				<div className="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
					<div className="sm:mx-auto sm:w-full sm:max-w-md">
						<div className="flex flex-col items-center justify-center space-y-4">
							<a href="/">
								<img src="/logo.svg" alt="Logo" className="h-12 w-12" />
							</a>
							<h1 className="text-center text-2xl font-bold tracking-tight">Derbent</h1>
						</div>
					</div>

					<div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
						<div className="bg-white px-6 py-8 shadow-sm ring-1 ring-zinc-200 sm:rounded-xl sm:px-10">{children}</div>
					</div>
				</div>
			</body>
		</html>
	);
});
