export class UserTokenVersionRepository {
	constructor(private kv: KVNamespace) {}

	private getKey(userId: string): string {
		return `user_ver:${userId}`;
	}

	/**
	 * Get the current token version for a user.
	 * Returns null if not cached (requires D1 fallback).
	 */
	async getUserVersion(userId: string): Promise<number | null> {
		const val = await this.kv.get(this.getKey(userId));
		return val ? parseInt(val, 10) : null;
	}

	/**
	 * Update the cache with the new version.
	 * We use a long TTL (e.g., 7 days) because this data rarely changes
	 * but is read frequently.
	 */
	async setUserVersion(userId: string, version: number): Promise<void> {
		await this.kv.put(this.getKey(userId), version.toString(), { expirationTtl: 604800 });
	}

	/**
	 * Clear the cache (forces a D1 fetch next time)
	 */
	async clearUserVersion(userId: string): Promise<void> {
		await this.kv.delete(this.getKey(userId));
	}
}
