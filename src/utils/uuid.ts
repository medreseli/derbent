/**
 * Generates a time-ordered UUIDv7.
 * This is crucial for B-Tree database performance (like SQLite/D1) as it prevents
 * page fragmentation caused by completely random UUIDv4 insertions.
 */
export function generateUUIDv7(): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	const timestamp = Date.now();

	// 48 bits of timestamp
	bytes[0] = Math.floor(timestamp / 2 ** 40) & 0xff;
	bytes[1] = Math.floor(timestamp / 2 ** 32) & 0xff;
	bytes[2] = Math.floor(timestamp / 2 ** 24) & 0xff;
	bytes[3] = Math.floor(timestamp / 2 ** 16) & 0xff;
	bytes[4] = Math.floor(timestamp / 2 ** 8) & 0xff;
	bytes[5] = timestamp & 0xff;

	// Version 7
	bytes[6] = (bytes[6] & 0x0f) | 0x70;

	// Variant 10... (RFC 9562)
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	let id = '';
	for (let i = 0; i < 16; i++) {
		id += bytes[i].toString(16).padStart(2, '0');
		if (i === 3 || i === 5 || i === 7 || i === 9) {
			id += '-';
		}
	}

	return id;
}
