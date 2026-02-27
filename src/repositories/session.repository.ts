import { Session } from '../types/session';

export class SessionRepository {
	constructor(private kv: KVNamespace) {}

	async create(sessionId: string, session: Session, ttlSeconds: number = 86400): Promise<void> {
		await this.kv.put(sessionId, JSON.stringify(session), { expirationTtl: ttlSeconds });
	}

	async get(sessionId: string): Promise<Session | null> {
		const data = await this.kv.get(sessionId);
		return data ? (JSON.parse(data) as Session) : null;
	}

	async delete(sessionId: string): Promise<void> {
		await this.kv.delete(sessionId);
	}
}
