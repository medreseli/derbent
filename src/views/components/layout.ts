import { html } from 'hono/html';

export const layout = (title: string, body: any, showLogo: boolean = true) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
			<style>
				:root {
					--bg: #f4f4f5;
					--card-bg: #ffffff;
					--text-main: #09090b;
					--text-muted: #71717a;
					--border: #e4e4e7;
					--primary: #18181b;
					--primary-hover: #27272a;
					--ring: rgba(24, 24, 27, 0.2);
					--error-bg: #fef2f2;
					--error-text: #ef4444;
					--error-border: #fca5a5;
					--success-bg: #f0fdf4;
					--success-text: #166534;
					--success-border: #bbf7d0;
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
					display: flex;
					justify-content: center;
					align-items: center;
					min-height: 100vh;
					margin: 0;
					background: var(--bg);
					color: var(--text-main);
					-webkit-font-smoothing: antialiased;
				}

				.wrapper {
					width: 100%;
					max-width: 480px;
					padding: 1.5rem;
				}

				.logo-container {
					display: flex;
					justify-content: center;
					margin-bottom: 2rem;
				}

				.home-link {
					display: inline-flex;
					transition: opacity 0.2s ease;
				}

				.home-link:hover {
					opacity: 0.8;
				}

				.card {
					background: var(--card-bg);
					padding: 2.5rem 2rem;
					border-radius: 12px;
					border: 1px solid var(--border);
					box-shadow:
						0 4px 6px -1px rgba(0, 0, 0, 0.05),
						0 2px 4px -2px rgba(0, 0, 0, 0.05);
				}

				h1 {
					margin: 0 0 0.5rem 0;
					font-size: 1.5rem;
					font-weight: 600;
					text-align: center;
					letter-spacing: -0.025em;
				}

				.subtitle {
					text-align: center;
					color: var(--text-muted);
					font-size: 0.925rem;
					margin-bottom: 2rem;
					line-height: 1.5;
				}

				.error {
					background: var(--error-bg);
					color: var(--error-text);
					padding: 0.75rem 1rem;
					border-radius: 6px;
					border: 1px solid var(--error-border);
					margin-bottom: 1.5rem;
					font-size: 0.875rem;
					font-weight: 500;
					display: flex;
					align-items: center;
					gap: 0.5rem;
				}

				.error::before {
					content: '!';
					display: inline-flex;
					justify-content: center;
					align-items: center;
					width: 1.25rem;
					height: 1.25rem;
					background: var(--error-text);
					color: white;
					border-radius: 50%;
					font-weight: bold;
					font-size: 0.75rem;
				}

				.form-group {
					margin-bottom: 1.25rem;
				}

				label {
					display: block;
					margin-bottom: 0.5rem;
					font-weight: 500;
					font-size: 0.875rem;
				}

				input {
					width: 100%;
					padding: 0.625rem 0.75rem;
					border: 1px solid var(--border);
					border-radius: 6px;
					font-size: 0.95rem;
					transition: all 0.15s ease;
					outline: none;
					color: var(--text-main);
				}

				input:focus {
					border-color: var(--primary);
					box-shadow: 0 0 0 3px var(--ring);
				}

				button {
					width: 100%;
					padding: 0.75rem;
					background: var(--primary);
					color: #fff;
					border: 1px solid var(--primary);
					border-radius: 6px;
					cursor: pointer;
					font-size: 0.95rem;
					font-weight: 500;
					transition: all 0.15s ease;
					margin-top: 0.5rem;
				}

				button:hover {
					background: var(--primary-hover);
					border-color: var(--primary-hover);
				}

				.footer-text {
					text-align: center;
					margin-top: 1.5rem;
					font-size: 0.875rem;
					color: var(--text-muted);
				}

				a {
					color: var(--text-main);
					font-weight: 500;
					text-decoration: none;
					transition: color 0.15s ease;
				}

				a:hover {
					text-decoration: underline;
				}

				/* Landing Page Specifics */
				.btn-group {
					display: flex;
					gap: 1rem;
					margin-top: 2rem;
				}

				.btn {
					flex: 1;
					text-align: center;
					padding: 0.5rem 0.75rem;
					border-radius: 6px;
					text-decoration: none;
					font-weight: 500;
					font-size: 0.875rem;
					transition: all 0.15s ease;
					cursor: pointer;
					display: inline-block;
				}

				.btn-primary {
					background: var(--primary);
					color: #fff;
					border: 1px solid var(--primary);
				}

				.btn-primary:hover {
					background: var(--primary-hover);
					text-decoration: none;
				}

				.btn-secondary {
					background: #fff;
					color: var(--text-main);
					border: 1px solid var(--border);
					box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
				}

				.btn-secondary:hover {
					background: var(--bg);
					text-decoration: none;
				}

				.btn-danger {
					background: transparent;
					color: var(--error-text);
					border: 1px solid var(--error-border);
				}

				.btn-danger:hover {
					background: var(--error-bg);
					text-decoration: none;
				}

				.lead {
					text-align: center;
					line-height: 1.6;
					color: var(--text-muted);
					font-size: 0.95rem;
					margin-bottom: 1rem;
				}

				/* App Dashboard Grid */
				.app-grid {
					display: flex;
					flex-direction: column;
					gap: 1rem;
					margin-top: 2rem;
				}

				.app-card {
					padding: 1.25rem;
					border: 1px solid var(--border);
					border-radius: 8px;
					background: var(--bg);
					display: flex;
					flex-direction: column;
					gap: 0.5rem;
				}

				.app-card-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
				}

				.app-card h3 {
					margin: 0;
					font-size: 1.1rem;
					color: var(--primary);
				}

				.app-card p {
					margin: 0;
					font-size: 0.85rem;
					color: var(--text-muted);
					line-height: 1.4;
				}

				.app-actions {
					display: flex;
					gap: 0.5rem;
					margin-top: 0.5rem;
				}

				.badge {
					font-size: 0.7rem;
					padding: 0.2rem 0.5rem;
					border-radius: 9999px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.05em;
				}
				.badge-active {
					background: var(--success-bg);
					color: var(--success-text);
					border: 1px solid var(--success-border);
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				${showLogo
					? html`
							<div class="logo-container">
								<a href="/" class="home-link" title="Go back to Derbent Home">
									<img src="/logo.svg" alt="Derbent Logo" width="40" height="40" />
								</a>
							</div>
						`
					: ''}
				<div class="card">
					<h1>${title}</h1>
					${body}
				</div>
			</div>
		</body>
	</html>
`;
