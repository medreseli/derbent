export type EmailQueueMessageType = 'verify_email' | 'reset_password' | 'magic_link';

export interface EmailQueueMessage {
	type: EmailQueueMessageType;
	to: string;
	token: string;
	appId?: string;
	redirect?: string;
}
