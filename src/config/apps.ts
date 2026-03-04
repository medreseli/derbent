/**
 * ADD NEW APPS HERE
 * This list strictly controls which apps are allowed to authenticate via Derbent.
 */
export const ALLOWED_APPS = ['sso', 'geveze', 'hodan'] as const;
export type AppId = (typeof ALLOWED_APPS)[number];

export interface AppConfig {
	id: AppId;
	name: string;
	description: string;
	prodUrl: string;
	devUrl: string;
}

export const REGISTERED_APPS: Record<AppId, AppConfig> = {
	sso: {
		id: 'sso',
		name: 'Derbent SSO',
		description: 'Your central, global account for all integrated services.',
		prodUrl: 'https://derbent.zerdalu.com',
		devUrl: 'http://localhost:8787',
	},
	geveze: {
		id: 'geveze',
		name: 'Geveze',
		description: 'Real-time chat and communication platform.',
		prodUrl: 'https://geveze.zerdalu.com',
		devUrl: 'http://localhost:8788', // Adjust this to Geveze's actual local port
	},
	hodan: {
		id: 'hodan',
		name: 'Hodan',
		description: 'Project management and workflow organization.',
		prodUrl: 'https://hodan.zerdalu.com',
		devUrl: 'http://localhost:8789', // Adjust this to Hodan's actual local port
	},
};
