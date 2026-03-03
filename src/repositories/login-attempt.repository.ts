export class LoginAttemptRepository {
	constructor(private kv: KVNamespace) {}

	private getKey(email: string): string {
		return `login_attempt:${email}`;
	}

	async getAttempts(email: string): Promise<number> {
		const val = await this.kv.get(this.getKey(email));
		return val ? parseInt(val, 10) : 0;
	}

	async incrementAttempts(email: string, ttlSeconds: number = 900): Promise<void> {
		const current = await this.getAttempts(email);
		await this.kv.put(this.getKey(email), (current + 1).toString(), { expirationTtl: ttlSeconds });
	}

	async clearAttempts(email: string): Promise<void> {
		await this.kv.delete(this.getKey(email));
	}
}
