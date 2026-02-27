export interface User {
	id: string;
	app: string;
	email: string;
	email_verified: number; // SQLite uses 0/1 for booleans; 0 = False, 1 = True
	phash: string;
	metadata: string;
	created_at: string;
	updated_at: string;
}
