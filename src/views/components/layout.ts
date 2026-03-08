import { html } from 'hono/html';

// Bump this version number whenever you update main.css to break the cache
const UI_VERSION = '2';

export const layout = (title: string, body: any, showLogo: boolean = true) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
			<link rel="stylesheet" href="/main.css?v=${UI_VERSION}" />
		</head>
		<body>
			<div class="wrapper">
				<div class="card">
					${showLogo
						? html`
								<div style="display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem;">
									<a
										href="/"
										style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none; color: inherit;"
										title="Return to Dashboard"
									>
										<img src="/logo.svg" alt="Derbent Logo" width="32" height="32" />
										<h1>${title}</h1>
									</a>
								</div>
							`
						: html`
								<div style="text-align: center; margin-bottom: 0.5rem;">
									<a href="/" style="text-decoration: none; color: inherit;" title="Return to Dashboard">
										<h1>${title}</h1>
									</a>
								</div>
							`}
					${body}
				</div>
			</div>
		</body>
	</html>
`;
