export class TokenRepository {
	constructor(private kv: KVNamespace) {}

	// Email Verification
	async saveEmailVerificationToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`verify_email:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromVerifyToken(token: string): Promise<string | null> {
		return await this.kv.get(`verify_email:${token}`);
	}

	async deleteEmailVerificationToken(token: string): Promise<void> {
		await this.kv.delete(`verify_email:${token}`);
	}

	// Password Reset
	async savePasswordResetToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`reset_pwd:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromResetToken(token: string): Promise<string | null> {
		return await this.kv.get(`reset_pwd:${token}`);
	}

	async deletePasswordResetToken(token: string): Promise<void> {
		await this.kv.delete(`reset_pwd:${token}`);
	}

	// Magic Link
	async saveMagicLinkToken(token: string, userId: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`magic_link:${token}`, userId, { expirationTtl: ttlSeconds });
	}

	async getUserIdFromMagicLinkToken(token: string): Promise<string | null> {
		return await this.kv.get(`magic_link:${token}`);
	}

	async deleteMagicLinkToken(token: string): Promise<void> {
		await this.kv.delete(`magic_link:${token}`);
	}

	// 2FA Setup
	async saveTwoFactorSetupSecret(userId: string, secret: string, ttlSeconds: number = 900): Promise<void> {
		await this.kv.put(`2fa_setup:${userId}`, secret, { expirationTtl: ttlSeconds });
	}

	async getTwoFactorSetupSecret(userId: string): Promise<string | null> {
		return await this.kv.get(`2fa_setup:${userId}`);
	}

	async deleteTwoFactorSetupSecret(userId: string): Promise<void> {
		await this.kv.delete(`2fa_setup:${userId}`);
	}

	// 2FA Login Token
	async saveTwoFactorLoginToken(
		token: string,
		data: { userId: string; appId: string; ip: string; userAgent: string },
		ttlSeconds: number = 300,
	): Promise<void> {
		await this.kv.put(`2fa_login:${token}`, JSON.stringify(data), { expirationTtl: ttlSeconds });
	}

	async getTwoFactorLoginData(token: string): Promise<{ userId: string; appId: string; ip: string; userAgent: string } | null> {
		const val = await this.kv.get(`2fa_login:${token}`);
		return val ? JSON.parse(val) : null;
	}

	async deleteTwoFactorLoginToken(token: string): Promise<void> {
		await this.kv.delete(`2fa_login:${token}`);
	}
}
