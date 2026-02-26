import { Session } from '../types/session';

export async function createSession(env: Env, session: Session): Promise<string> {
	const sessionId = crypto.randomUUID();
	// Expiration defined as 86400 seconds (24 hours)
	await env.KV.put(sessionId, JSON.stringify(session), { expirationTtl: 86400 });
	return sessionId;
}

export async function getSession(env: Env, sessionId: string): Promise<Session | null> {
	const data = await env.KV.get(sessionId);
	if (!data) return null;
	try {
		return JSON.parse(data) as Session;
	} catch {
		return null;
	}
}

export async function deleteSession(env: Env, sessionId: string): Promise<void> {
	await env.KV.delete(sessionId);
}
