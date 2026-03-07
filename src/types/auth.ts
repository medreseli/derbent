export interface LoginResult {
	requires2FA: boolean;
	sessionId?: string;
	twoFactorToken?: string;
	app: string;
}
