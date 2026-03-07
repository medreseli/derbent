import { html } from 'hono/html';

export const layout = (title: string, body: any, showLogo: boolean = true) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
			<link rel="stylesheet" href="/main.css" />
		</head>
		<body>
			<div class="wrapper">
				<div class="card">
					${showLogo
						? html`
								<div style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-bottom: 0.5rem;">
									<img src="/logo.svg" alt="Derbent Logo" width="32" height="32" />
									<h1>${title}</h1>
								</div>
							`
						: html`<h1>${title}</h1>`}
					${body}
				</div>
			</div>
		</body>
	</html>
`;
