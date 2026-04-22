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

	return `pbkdf2_sha256:${iterations}:${saltBase64}:${hashBase64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const parts = storedHash.split(':');

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
			iterations: iterations,
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
	if (parts.length !== 4) return true;
	if (parts[0] !== 'pbkdf2_sha256') return true;

	const iterations = parseInt(parts[1], 10);
	if (iterations < targetIterations) return true;

	return false;
}

export function bufferToBase64(buf: ArrayBuffer | Uint8Array): string {
	const bytes = new Uint8Array(buf);
	let binary = '';
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

export function base64ToBuffer(b64: string): Uint8Array {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

// --- SECURE KV STORAGE CRYPTO (AES-GCM) ---

async function getAESKey(secretKey: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyMaterial = encoder.encode(secretKey);
	// Hash the secret to ensure it is exactly 256 bits (32 bytes) for AES-256
	const hash = await crypto.subtle.digest('SHA-256', keyMaterial);
	return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptKV(plainText: string, secretKey: string): Promise<string> {
	const key = await getAESKey(secretKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encodedText = new TextEncoder().encode(plainText);

	const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedText);

	const ivBase64 = bufferToBase64(iv);
	const cipherBase64 = bufferToBase64(cipherBuffer);

	return JSON.stringify({ iv: ivBase64, data: cipherBase64 });
}

export async function decryptKV(encryptedJson: string, secretKey: string): Promise<string> {
	const parsed = JSON.parse(encryptedJson);
	if (!parsed.iv || !parsed.data) throw new Error('Invalid encrypted JSON structure');

	const iv = base64ToBuffer(parsed.iv);
	const cipherData = base64ToBuffer(parsed.data);
	const key = await getAESKey(secretKey);

	const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherData);
	return new TextDecoder().decode(decryptedBuffer);
}
