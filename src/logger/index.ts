import pino, { type LoggerOptions } from "pino";
import { env } from "../env/index.js";

const options: LoggerOptions = {
  level: env.NODE_ENV === "DEV" ? "debug" : "info",
};

if (env.NODE_ENV === "DEV") {
  options.transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:HH:MM:ss",
      ignore: "pid,hostname",
      messageKey: "msg",
    },
  };
}

export const logger = pino(options);
