export interface User {
	id: string;
	app: string;
	email: string;
	email_verified: number; // SQLite uses 0/1 for booleans; 0 = False, 1 = True
	phash: string;
	token_version: number;
	metadata: string;
	two_factor_secret: string | null;
	two_factor_enabled: number; // 0 = False, 1 = True
	is_locked: number; // 0 = False, 1 = True
	created_at: string;
	updated_at: string;
}
