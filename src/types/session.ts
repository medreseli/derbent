/**
 * T represents the custom data shape stored in 'data'.
 * Defaults to a simple key-value pair if not specified.
 */
export interface Session<T = Record<string, unknown>> {
	// --- System Fields (Required & Protected) ---
	userId: string;
	email: string;
	appId: string;
	createdAt: number;
	ip: string;
	userAgent: string;
	tokenVersion: number;

	// --- User Fields (Customizable) ---
	// This maps to the 'metadata' column in your D1 Users table.
	data: T;
}
