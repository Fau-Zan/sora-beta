import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import chalk from 'chalk';

export const errorStackFormat = winston.format((info) => {
      if (info instanceof Error) {
            return Object.assign({}, info, {
                  stack: info.stack,
                  message: info.message,
            });
      }
      return info;
});

export const Logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
            winston.format((info) => {
                  info.level = info.level.toUpperCase();
                  return info;
            })(),
            winston.format.timestamp({
                  format: 'YYYY-MM-DD HH:mm:ss',
            }),
            winston.format.printf((info) => {
                  const { timestamp, level, message } = info;
                  const coloredLevel =
                        level === 'error'
                              ? chalk.red(level)
                              : level === 'warn'
                              ? chalk.yellow(level)
                              : level === 'debug'
                              ? chalk.blue(level)
                              : chalk.green(level);
                  return `${timestamp} [${coloredLevel}] ${message}`;
            }),
      ),
      transports: [
            new DailyRotateFile({
                  filename: 'logs/app-%DATE%.log',
                  datePattern: 'YYYY-MM-DD',
                  maxFiles: '7d',
            }),
            new winston.transports.Console({
                  format: winston.format.combine(
                        winston.format((info) => {
                              info.level = info.level.toUpperCase();
                              return info;
                        })(),
                        winston.format.timestamp({
                              format: 'YYYY-MM-DD HH:mm:ss',
                        }),
                        winston.format.colorize(),
                        winston.format.printf((info) => {
                              const { timestamp, level, message } = info;
                              const coloredLevel =
                                    level === 'error'
                                          ? chalk.red(level)
                                          : level === 'warn'
                                          ? chalk.yellow(level)
                                          : level === 'debug'
                                          ? chalk.blue(level)
                                          : chalk.green(level);
                              return `${timestamp} [${coloredLevel}] ${message}`;
                        }),
                  ),
            }),
      ],
});
