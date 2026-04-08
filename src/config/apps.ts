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
	icon: string; // Path to the SVG in the public folder
	prodUrl: string;
	devUrl: string;
}

export const REGISTERED_APPS: Record<AppId, AppConfig> = {
	sso: {
		id: 'sso',
		name: 'Single sign-on',
		description: 'Your one account for all our apps.',
		icon: '/sso.svg',
		prodUrl: 'https://derbent.zerdalu.com',
		devUrl: 'http://localhost:7777',
	},
	hodan: {
		id: 'hodan',
		name: 'Hodan',
		description: 'Your storyboarding studio',
		icon: '/hodan.svg',
		prodUrl: 'https://namedar.zerdalu.com',
		devUrl: 'http://localhost:5173',
	},
	namedar: {
		id: 'namedar',
		name: 'Nâmedâr',
		description: 'OMR solution for examinations',
		icon: '/namedar.svg',
		prodUrl: 'https://namedar.zerdalu.com',
		devUrl: 'http://localhost:5173',
	},
};
