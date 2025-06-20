// Frontend logger for browser environment
// This replaces the backend winston logger for client-side code

interface Logger {
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  debug(message: string, meta?: unknown): void;
}

class BrowserLogger implements Logger {
  private isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';

  private formatMessage(level: string, message: string, meta?: unknown): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  info(message: string, meta?: unknown): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, meta));
    }
  }

  warn(message: string, meta?: unknown): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: unknown): void {
    console.error(this.formatMessage('error', message, meta));
    
    // In production, you might want to send errors to a monitoring service
    // if (import.meta.env.PROD) {
    //   // Send to Sentry, LogRocket, etc.
    // }
  }

  debug(message: string, meta?: unknown): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new BrowserLogger();
export default logger;
