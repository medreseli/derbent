export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	silent: 4,
};

export class Logger {
	private levelValue: number;

	constructor(level: string = 'info') {
		const normalizedLevel = (level.toLowerCase() as LogLevel) || 'info';
		this.levelValue = LOG_LEVELS[normalizedLevel] ?? LOG_LEVELS.info;
	}

	debug(message: string, ...args: any[]) {
		if (this.levelValue <= LOG_LEVELS.debug) {
			console.debug(`[DEBUG] ${message}`, ...args);
		}
	}

	info(message: string, ...args: any[]) {
		if (this.levelValue <= LOG_LEVELS.info) {
			console.info(`[INFO] ${message}`, ...args);
		}
	}

	warn(message: string, ...args: any[]) {
		if (this.levelValue <= LOG_LEVELS.warn) {
			console.warn(`[WARN] ${message}`, ...args);
		}
	}

	error(message: string, ...args: any[]) {
		if (this.levelValue <= LOG_LEVELS.error) {
			console.error(`[ERROR] ${message}`, ...args);
		}
	}
}
