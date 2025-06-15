// Frontend logger implementation
interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  
  private log(level: keyof LogLevel, message: string, ...args: any[]) {
    if (!this.isDevelopment && level === 'DEBUG') {
      return; // Skip debug logs in production
    }
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] ${level}:`;
    
    switch (level) {
      case 'ERROR':
        console.error(prefix, message, ...args);
        break;
      case 'WARN':
        console.warn(prefix, message, ...args);
        break;
      case 'INFO':
        console.info(prefix, message, ...args);
        break;
      case 'DEBUG':
        console.debug(prefix, message, ...args);
        break;
      default:
        console.log(prefix, message, ...args);
    }
  }

  error(message: string, ...args: any[]) {
    this.log('ERROR', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('WARN', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('INFO', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('DEBUG', message, ...args);
  }
}

export const logger = new Logger();
