export interface AppRecord {
	id: string;
	name: string;
	description: string | null;
	icon: string | null; // Raw SVG string
	prod_url: string;
	dev_url: string;
	allow_signups: 0 | 1;
	allow_logins: 0 | 1;
	created_at: string;
	updated_at: string;
}
