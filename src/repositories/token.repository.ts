export class TokenRepository {
	constructor(private kv: KVNamespace) {}

	// Email Verification
	async saveEmailVerificationToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`verify_email:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromVerifyToken(token: string): Promise<string | null> {
		return await this.kv.get(`verify_email:${token}`);
	}

	async deleteEmailVerificationToken(token: string): Promise<void> {
		await this.kv.delete(`verify_email:${token}`);
	}

	// Password Reset
	async savePasswordResetToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`reset_pwd:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromResetToken(token: string): Promise<string | null> {
		return await this.kv.get(`reset_pwd:${token}`);
	}

	async deletePasswordResetToken(token: string): Promise<void> {
		await this.kv.delete(`reset_pwd:${token}`);
	}
}
