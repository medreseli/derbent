import { html } from 'hono/html';
import { derbentLogo } from './layout';

export const adminLayout = (title: string, body: any) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title} | Derbent Admin</title>
			<style>
				:root {
					--bg: #f4f4f5;
					--card-bg: #ffffff;
					--text-main: #09090b;
					--text-muted: #71717a;
					--border: #e4e4e7;
					--primary: #18181b;
					--primary-hover: #27272a;
				}

				* {
					box-sizing: border-box;
				}

				body {
					font-family:
						ui-sans-serif,
						system-ui,
						-apple-system,
						BlinkMacSystemFont,
						'Segoe UI',
						Roboto,
						'Helvetica Neue',
						Arial,
						sans-serif;
					margin: 0;
					background: var(--bg);
					color: var(--text-main);
					-webkit-font-smoothing: antialiased;
				}

				.navbar {
					background: var(--card-bg);
					border-bottom: 1px solid var(--border);
					padding: 1rem 2rem;
					display: flex;
					align-items: center;
					justify-content: space-between;
				}

				.navbar-brand {
					display: flex;
					align-items: center;
					gap: 1rem;
					font-weight: 600;
					font-size: 1.1rem;
				}

				.container {
					max-width: 1200px;
					margin: 2rem auto;
					padding: 0 2rem;
				}

				.card {
					background: var(--card-bg);
					padding: 2rem;
					border-radius: 12px;
					border: 1px solid var(--border);
					box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
					margin-bottom: 2rem;
					overflow-x: auto;
				}

				h2 {
					margin-top: 0;
					font-size: 1.25rem;
					font-weight: 600;
				}

				table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 1rem;
					font-size: 0.9rem;
				}

				th,
				td {
					text-align: left;
					padding: 0.75rem 1rem;
					border-bottom: 1px solid var(--border);
				}

				th {
					color: var(--text-muted);
					font-weight: 500;
				}

				.badge {
					display: inline-block;
					padding: 0.25rem 0.5rem;
					border-radius: 4px;
					font-size: 0.75rem;
					font-weight: 500;
				}

				.badge-success {
					background: #dcfce7;
					color: #166534;
				}
				.badge-warning {
					background: #fef08a;
					color: #854d0e;
				}
				.badge-neutral {
					background: #f4f4f5;
					color: #3f3f46;
				}

				.code {
					font-family: monospace;
					font-size: 0.85rem;
					color: var(--text-muted);
				}
			</style>
		</head>
		<body>
			<nav class="navbar">
				<div class="navbar-brand">${derbentLogo} Derbent Admin</div>
				<div>
					<a href="/logout?app_id=sso&redirect=/" style="color: var(--text-main); text-decoration: none; font-weight: 500;">Log out</a>
				</div>
			</nav>
			<div class="container">${body}</div>
		</body>
	</html>
`;
