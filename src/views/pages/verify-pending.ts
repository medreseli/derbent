import { html } from 'hono/html';
import { layout } from '../components/layout';

export const verifyPendingPage = (appId: string = 'sso', redirect: string = '/') => {
	const qs = new URLSearchParams({ app_id: appId, redirect }).toString();

	return layout(
		`Check your inbox`,
		html`
			<p class="lead">We've sent a verification link to your email address. Please click the link to activate your account.</p>
			<p class="subtitle" style="margin-top: 1rem;">The link will expire in 15 minutes.</p>
			<div class="btn-group">
				<a href="/login?${qs}" class="btn btn-secondary">Return to login</a>
			</div>
		`,
	);
};
