export class TokenRepository {
	constructor(private kv: KVNamespace) {}

	// Email Verification (existing)
	async saveEmailVerificationToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`verify_email:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromVerifyToken(token: string): Promise<string | null> {
		return await this.kv.get(`verify_email:${token}`);
	}

	// Password Reset (new)
	async savePasswordResetToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`reset_pwd:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromResetToken(token: string): Promise<string | null> {
		return await this.kv.get(`reset_pwd:${token}`);
	}

	async deleteToken(tokenKey: string): Promise<void> {
		await this.kv.delete(tokenKey);
	}
}
