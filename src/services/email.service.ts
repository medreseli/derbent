export class EmailService {
	constructor(
		private resendApiKey?: string,
		private baseUrl: string = 'https://derbent.zerdalu.com',
	) {}

	async sendVerificationEmail(to: string, token: string): Promise<void> {
		const verificationUrl = `${this.baseUrl}/verify-email?token=${token}`;

		if (!this.resendApiKey) {
			console.log(`[MOCK EMAIL] To: ${to} | Link: ${verificationUrl}`);
			return;
		}

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: 'Derbent <auth@zerdalu.com>',
				to,
				subject: 'Verify your email address',
				html: `
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2>Confirm your email</h2>
						<p>Click the button below to verify your account. This link expires in 15 minutes.</p>
						<a href="${verificationUrl}" style="background: #18181b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Verify Email</a>
						<p style="color: #71717a; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
					</div>
				`,
			}),
		});

		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`Email provider error: ${errorData}`);
		}
	}

	async sendPasswordResetEmail(to: string, token: string): Promise<void> {
		const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

		if (!this.resendApiKey) {
			console.log(`[MOCK EMAIL] Reset Link: ${resetUrl}`);
			return;
		}

		await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: 'Derbent <auth@zerdalu.com>',
				to,
				subject: 'Reset your password',
				html: `
                <h2>Password Reset Request</h2>
                <p>Click the link below to set a new password. This link expires in 15 minutes.</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
                <p>If you didn't request this, you can ignore this email.</p>
            `,
			}),
		});
	}
}
