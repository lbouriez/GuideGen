import winston, { format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const isTest = process.env.NODE_ENV === 'test';

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

type LogMessage = string | number | Record<string, any> | unknown;

const normalizeMessage = (message: LogMessage) => {
  if (typeof message === 'string' || typeof message === 'number') {
    return String(message);
  }
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};

const normalizeContext = (context?: unknown): Record<string, any> => {
  if (!context) return {};
  if (typeof context === 'object' && !Array.isArray(context)) return context as Record<string, any>;

  // For primitives / arrays / weird stuff -> wrap under a key
  try {
    return { value: JSON.stringify(context) };
  } catch {
    return { value: String(context) };
  }
};

function extractErrorContext(errorOrContext: unknown): Record<string, any> {
  if (errorOrContext instanceof Error) {
    return {
      errorMessage: errorOrContext.message,
    };
  } else if (typeof errorOrContext === 'object' && errorOrContext !== null) {
    return errorOrContext as Record<string, any>;
  } else if (typeof errorOrContext === 'string') {
    return { errorMessage: errorOrContext };
  }
  return {};
}

const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()} | ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
  })
);

const getLogLevel = (): string => {
  const env = (process.env.LOG_LEVEL || 'info').toLowerCase();
  return Object.keys(logLevels).includes(env) ? env : 'info';
};

const buildTransports = () => {
  const transportList: winston.transport[] = [];

  // Always add colorized console output
  transportList.push(
    new transports.Console({
      format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
          return `[${timestamp}] ${level} | ${message}${metaStr}${stack ? `\n${stack}` : ''}`;
        })
      ),
    })
  );

  // Add file logging in non-test mode
  if (!isTest) {
    transportList.push(
      new DailyRotateFile({
        filename: 'logs/application-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
      })
    );
  }

  return transportList;
};

const winstonLogger = winston.createLogger({
  levels: logLevels,
  level: getLogLevel(),
  format: customFormat,
  transports: buildTransports(),

  // Only add exception handlers in non-test mode
  exceptionHandlers: isTest ? [] : [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],

  // Only add rejection handlers in non-test mode
  rejectionHandlers: isTest ? [] : [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],

  // Set exitOnError: false when no rejection handlers (test mode)
  exitOnError: !isTest,
});

export const logger = {
  debug: (message: LogMessage, context?: Record<string, any>) => {
    winstonLogger.debug(normalizeMessage(message), normalizeContext(context));
  },

  log: (message: LogMessage, context?: Record<string, any>) => {
    winstonLogger.info(normalizeMessage(message), normalizeContext(context));
  },

  info: (message: LogMessage, context?: Record<string, any>) => {
    winstonLogger.info(normalizeMessage(message), normalizeContext(context));
  },

  warn: (
    message: LogMessage,
    errorOrContext?: unknown,
    context?: unknown
  ) => {
    let finalContext = normalizeContext(context);

    if (errorOrContext !== undefined) {
      const extractedContext = extractErrorContext(errorOrContext);
      finalContext = { ...finalContext, ...extractedContext };
    }

    winstonLogger.warn(normalizeMessage(message), finalContext);
  },

  error: (
    message: LogMessage,
    errorOrContext?: unknown,
    context?: unknown
  ) => {
    let finalContext = normalizeContext(context);

    if (errorOrContext !== undefined) {
      if (errorOrContext instanceof Error) {
        finalContext = {
          ...finalContext,
          errorMessage: errorOrContext.message,
          ...(process.env.NODE_ENV === 'development' && {
            errorStack: errorOrContext.stack,
          }),
        };
      } else {
        const extractedContext = extractErrorContext(errorOrContext);
        finalContext = { ...finalContext, ...extractedContext };
      }
    }

    winstonLogger.error(normalizeMessage(message), finalContext);
  },
};

export default logger;
