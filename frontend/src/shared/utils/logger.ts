// Frontend logger implementation
interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

// Safely detect development mode
const isDevelopmentMode = (): boolean => {
  try {
    // Check for Vite/browser environment
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return import.meta.env.DEV === true;
    }

    // Fallback for Node/test environment
    return process.env.NODE_ENV !== "production";
  } catch (_e) {
    // Default to development in case of errors
    return true;
  }
};

class Logger {
  private isDevelopment = isDevelopmentMode();

  private log(level: keyof LogLevel, message: string, ...args: unknown[]) {
    if (!this.isDevelopment && level === "DEBUG") {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level}:`;

    switch (level) {
      case "ERROR":
        console.error(prefix, message, ...args);
        break;
      case "WARN":
        console.warn(prefix, message, ...args);
        break;
      case "INFO":
        console.info(prefix, message, ...args);
        break;
      case "DEBUG":
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  error(message: string, ...args: unknown[]) {
    this.log("ERROR", message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log("WARN", message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log("INFO", message, ...args);
  }

  debug(message: string, ...args: unknown[]) {
    this.log("DEBUG", message, ...args);
  }
}

export const logger = new Logger();
