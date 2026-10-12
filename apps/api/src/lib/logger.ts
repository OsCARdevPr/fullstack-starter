import { type DestinationStream, type Logger, pino } from "pino";

export type { Logger };

/** Header paths that must never reach log output. */
export const REDACTED_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'res.headers["set-cookie"]',
  "headers.authorization",
  "headers.cookie",
  'headers["set-cookie"]',
];

export interface LoggerOptions {
  level: string;
  /** Human-readable output through pino-pretty. Development only: it is a dev dependency. */
  pretty: boolean;
}

export function createLogger(options: LoggerOptions, destination?: DestinationStream): Logger {
  const base = {
    level: options.level,
    redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  };

  if (options.pretty && !destination) {
    return pino({
      ...base,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname" },
      },
    });
  }

  return destination ? pino(base, destination) : pino(base);
}
