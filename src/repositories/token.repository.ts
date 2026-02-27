export class TokenRepository {
	constructor(private kv: KVNamespace) {}

	async saveEmailVerificationToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`verify_email:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromToken(token: string): Promise<string | null> {
		return await this.kv.get(`verify_email:${token}`);
	}

	async deleteToken(token: string): Promise<void> {
		await this.kv.delete(`verify_email:${token}`);
	}
}
