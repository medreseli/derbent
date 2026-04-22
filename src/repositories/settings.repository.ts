import { decryptKV, encryptKV } from '../utils/crypto';

export interface SettingRecord {
	key: string;
	value: string | null;
	is_secret: number;
}

export class SettingsRepository {
	private readonly CACHE_KEY = 'derbent_config_cache';

	constructor(
		private db: D1Database,
		private kv: KVNamespace,
	) {}

	async getAll(): Promise<SettingRecord[]> {
		const { results } = await this.db.prepare('SELECT key, value, is_secret FROM settings').all<SettingRecord>();
		return results || [];
	}

	async update(key: string, value: string, isSecret: boolean): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO settings (key, value, is_secret) 
                 VALUES (?, ?, ?) 
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_secret = excluded.is_secret`,
			)
			.bind(key, value, isSecret ? 1 : 0)
			.run();
	}

	async delete(key: string): Promise<void> {
		await this.db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
	}

	// --- CACHE MANAGEMENT ---

	async getCachedConfig(masterKey: string): Promise<Record<string, string> | null> {
		const encryptedCache = await this.kv.get(this.CACHE_KEY);
		if (!encryptedCache) return null;

		try {
			const decryptedString = await decryptKV(encryptedCache, masterKey);
			return JSON.parse(decryptedString);
		} catch (error) {
			console.error('[SettingsRepo] Failed to decrypt config cache. It may have been corrupted or the master key changed.');
			return null;
		}
	}

	async buildAndCacheConfig(masterKey: string): Promise<Record<string, string>> {
		const records = await this.getAll();
		const configMap: Record<string, string> = {};

		for (const record of records) {
			if (record.value) {
				configMap[record.key] = record.value;
			}
		}

		try {
			const encryptedString = await encryptKV(JSON.stringify(configMap), masterKey);
			// Cache for 30 days. We will manually invalidate this on updates.
			await this.kv.put(this.CACHE_KEY, encryptedString, { expirationTtl: 2592000 });
		} catch (error) {
			console.error('[SettingsRepo] Failed to encrypt and cache config.', error);
		}

		return configMap;
	}

	async invalidateCache(): Promise<void> {
		await this.kv.delete(this.CACHE_KEY);
	}
}
