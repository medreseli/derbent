export interface DerbentConfig {
	APP_ENV: string;
	LOG_LEVEL: string;
	APP_NAME: string;
	BASE_URL: string;
	COOKIE_DOMAIN?: string;
	RESEND_DOMAIN?: string;
	RESEND_API_KEY?: string;
	GITHUB_CLIENT_ID?: string;
	GITHUB_CLIENT_SECRET?: string;
	GOOGLE_CLIENT_ID?: string;
	GOOGLE_CLIENT_SECRET?: string;
	PBKDF2_ITERATIONS: string;
	AUDIT_LOG_RETENTION_DAYS: string;
}
