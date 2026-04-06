/**
 * ADD NEW APPS HERE
 * This list strictly controls which apps are allowed to authenticate via Derbent.
 */
export const ALLOWED_APPS = ['sso', 'hodan', 'namedar'] as const;
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
		name: 'Single sign-on',
		description: 'Your central, global account for all integrated services.',
		prodUrl: 'https://derbent.zerdalu.com',
		devUrl: 'http://localhost:8787',
	},
	hodan: {
		id: 'hodan',
		name: 'Hodan',
		description: 'Your storyboarding studio',
		prodUrl: 'https://namedar.zerdalu.com',
		devUrl: 'http://localhost:5173', // Adjust this to Nâmedâr's actual local port
	},
	namedar: {
		id: 'namedar',
		name: 'Nâmedâr',
		description: 'OMR solution for examinations',
		prodUrl: 'https://namedar.zerdalu.com',
		devUrl: 'http://localhost:5173', // Adjust this to Nâmedâr's actual local port
	},
};
