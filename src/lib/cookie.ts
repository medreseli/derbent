export function createSetCookieHeader(appId: string, sessionId: string, maxAge: number = 86400): string {
	return `session_${appId}=${sessionId}; Domain=.zerdalu.com; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function parseCookie(cookieHeader: string | null, appId: string): string | null {
	if (!cookieHeader) return null;
	// Handle parsing avoiding issues with space after semicolons
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)session_${appId}=([^;]+)`));
	return match ? match[1] : null;
}
