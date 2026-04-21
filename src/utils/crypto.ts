export async function hashPassword(password: string, iterations: number): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: iterations,
			hash: 'SHA-256',
		},
		keyMaterial,
		256,
	);

	const saltBase64 = bufferToBase64(salt);
	const hashBase64 = bufferToBase64(hashBuffer);

	// Format: algo:iterations:salt:hash
	return `pbkdf2_sha256:${iterations}:${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const parts = storedHash.split(':');

	// Strict format check: algo:iterations:salt:hash
	if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
		console.error('[Crypto] Invalid hash format or unsupported algorithm.');
		return false;
	}

	const iterations = parseInt(parts[1], 10);
	const saltBase64 = parts[2];
	const hashBase64 = parts[3];
	const salt = base64ToBuffer(saltBase64);

	const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);

	const hashBuffer = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: iterations, // Use the iterations stored in the DB, not the Env var
			hash: 'SHA-256',
		},
		keyMaterial,
		256,
	);

	const computedHashBase64 = bufferToBase64(hashBuffer);
	return computedHashBase64 === hashBase64;
}

export function needsRehash(storedHash: string, targetIterations: number): boolean {
	const parts = storedHash.split(':');

	// If the format isn't exactly what we expect currently, we need a rehash.
	// This covers missing algorithm prefixes, old formats, or completely different algorithms.
	if (parts.length !== 4) return true;
	if (parts[0] !== 'pbkdf2_sha256') return true;

	const iterations = parseInt(parts[1], 10);
	if (iterations < targetIterations) return true;

	return false;
}

function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
	const bytes = new Uint8Array(buf);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}
