import winston from 'winston';
import path from 'path';

let logger: winston.Logger;

export function getLogger(): winston.Logger {
  if (!logger) {
    logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, ...metadata }) => {
          let msg = `${timestamp} [${level}] : ${message}`;
          
          if (Object.keys(metadata).length > 0) {
            msg += '\n' + JSON.stringify(metadata, null, 2);
          }
          
          return msg;
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'data', '.logs', 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'data', '.logs', 'combined.log')
        })
      ]
    });
  }
  return logger;
}

export function logError(message: string, error: Error | unknown): void {
  const errorObject = error instanceof Error ? 
    { message: error.message, stack: error.stack } : 
    { message: String(error) };
    
  logger.error(message, { error: errorObject });
}
