import { html } from 'hono/html';
import { layout } from '../components/layout';

export const landingPage = () => {
	return layout(
		`Derbent`,
		html`
			<p class="lead">A derbent was a fortified pass &mdash; a narrow gate between worlds, guarded and deliberate.</p>
			<p class="lead">
				Derbent stands at the boundary of your systems, verifying identity and granting passage. Nothing enters without recognition. Nothing
				passes without consent.
			</p>
			<div class="btn-group">
				<a href="/login?app_id=sso" class="btn btn-primary">Log in</a>
				<a href="/register?app_id=sso" class="btn btn-secondary">Register</a>
			</div>
		`,
	);
};
