import { html } from 'hono/html';

export const derbentLogo = html` <svg width="40" height="40" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
	<rect width="32" height="32" rx="8" fill="#18181b" />
	<path
		d="M11 22V14.5C11 11.4624 13.4624 9 16.5 9C19.5376 9 22 11.4624 22 14.5V22"
		stroke="white"
		stroke-width="2.5"
		stroke-linecap="round"
	/>
</svg>`;

const faviconSvg = `data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 32 32' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='32' height='32' rx='8' fill='%2318181b' /%3E%3Cpath d='M11 22V14.5C11 11.4624 13.4624 9 16.5 9C19.5376 9 22 11.4624 22 14.5V22' stroke='white' stroke-width='2.5' stroke-linecap='round' /%3E%3C/svg%3E`;

export const layout = (title: string, body: any, showLogo: boolean = true) => html`
	<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta charset="UTF-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>${title}</title>
			<link rel="icon" type="image/svg+xml" href="${faviconSvg}" />
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
					max-width: 420px;
					padding: 1.5rem;
				}

				.logo-container {
					display: flex;
					justify-content: center;
					margin-bottom: 2rem;
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
					padding: 0.75rem;
					border-radius: 6px;
					text-decoration: none;
					font-weight: 500;
					font-size: 0.95rem;
					transition: all 0.15s ease;
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

				.lead {
					text-align: center;
					line-height: 1.6;
					color: var(--text-muted);
					font-size: 0.95rem;
					margin-bottom: 1rem;
				}
			</style>
		</head>
		<body>
			<div class="wrapper">
				${showLogo ? html`<div class="logo-container">${derbentLogo}</div>` : ''}
				<div class="card">
					<h1>${title}</h1>
					${body}
				</div>
			</div>
		</body>
	</html>
`;
