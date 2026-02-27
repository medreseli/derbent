export class EmailService {
	constructor(private resendApiKey?: string) {}

	async sendVerificationEmail(to: string, token: string): Promise<void> {
		const verificationUrl = `https://derbent.zerdalu.com/verify-email?token=${token}`;

		// Graceful fallback for local development if no API key is set
		if (!this.resendApiKey) {
			console.log('\n[MOCK EMAIL] Verification Email Sent!');
			console.log(`To: ${to}`);
			console.log(`Link: ${verificationUrl}\n`);
			return;
		}

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: 'Derbent <auth@zerdalu.com>', // Ensure this domain is verified in Resend
				to,
				subject: 'Verify your email address',
				html: `
					<h2>Welcome to Derbent</h2>
					<p>Please click the link below to verify your email address. This link expires in 15 minutes.</p>
					<p><a href="${verificationUrl}">${verificationUrl}</a></p>
				`,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			console.error('Resend API Error:', error);
			// We might not want to throw and break the user flow, just log it.
			// But for strict environments, you could throw an AppError here.
		}
	}
}
