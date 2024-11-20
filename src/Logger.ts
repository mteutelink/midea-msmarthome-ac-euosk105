import winston from 'winston';

export const _LOGGER = winston.createLogger({
	level: "debug",
	format: winston.format.json(),
	transports: [new winston.transports.Console()],
});