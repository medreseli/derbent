import { EmailQueueMessage } from '../types/queue';

export class EmailService {
	private fromEmail: string;

	constructor(
		private appName: string,
		private baseUrl: string,
		private resendApiKey: string,
		private resendDomain: string,
		private queue?: Queue<EmailQueueMessage>,
	) {
		this.fromEmail = `noreply@${this.resendDomain}`;
	}

	async sendVerificationEmail(to: string, token: string, appId?: string, redirect?: string): Promise<void> {
		if (this.queue) {
			await this.queue.send({ type: 'verify_email', to, token, appId, redirect });
			return;
		}
		// Fallback for tests or local execution if queue is not bound
		await this.processVerificationEmail(to, token, appId, redirect);
	}

	async sendPasswordResetEmail(to: string, token: string): Promise<void> {
		if (this.queue) {
			await this.queue.send({ type: 'reset_password', to, token });
			return;
		}
		await this.processPasswordResetEmail(to, token);
	}

	async sendMagicLinkEmail(to: string, token: string, appId: string, redirect: string): Promise<void> {
		if (this.queue) {
			await this.queue.send({ type: 'magic_link', to, token, appId, redirect });
			return;
		}
		await this.processMagicLinkEmail(to, token, appId, redirect);
	}

	async processMessage(msg: EmailQueueMessage): Promise<void> {
		switch (msg.type) {
			case 'verify_email':
				await this.processVerificationEmail(msg.to, msg.token, msg.appId, msg.redirect);
				break;
			case 'reset_password':
				await this.processPasswordResetEmail(msg.to, msg.token);
				break;
			case 'magic_link':
				if (!msg.appId || !msg.redirect) throw new Error('Missing appId or redirect for magic link');
				await this.processMagicLinkEmail(msg.to, msg.token, msg.appId, msg.redirect);
				break;
		}
	}

	private async processVerificationEmail(to: string, token: string, appId?: string, redirect?: string): Promise<void> {
		const qs = new URLSearchParams({ token });
		if (appId) qs.set('app_id', appId);
		if (redirect) qs.set('redirect', redirect);

		const verificationUrl = `${this.baseUrl}/verify-email?${qs.toString()}`;

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: `Derbent <${this.fromEmail}>`,
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

	private async processPasswordResetEmail(to: string, token: string): Promise<void> {
		const resetUrl = `${this.baseUrl}/reset-password?token=${token}`;

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: `Derbent <${this.fromEmail}>`,
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

		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`Email provider error: ${errorData}`);
		}
	}

	private async processMagicLinkEmail(to: string, token: string, appId: string, redirect: string): Promise<void> {
		const qs = new URLSearchParams({ token, app_id: appId, redirect }).toString();
		const magicLinkUrl = `${this.baseUrl}/verify-magic-link?${qs}`;

		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.resendApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: `Derbent <${this.fromEmail}>`,
				to,
				subject: `Sign in to ${this.appName}`,
				html: `
					<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
						<h2>Sign in securely</h2>
						<p>Click the button below to sign in to your account. This link expires in 15 minutes.</p>
						<a href="${magicLinkUrl}" style="background: #18181b; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">Sign In to ${appId === 'sso' ? 'Derbent' : appId}</a>
						<p style="color: #71717a; font-size: 12px;">If you didn't request this link, you can safely ignore this email.</p>
					</div>
				`,
			}),
		});

		if (!response.ok) {
			const errorData = await response.text();
			throw new Error(`Email provider error: ${errorData}`);
		}
	}
}
