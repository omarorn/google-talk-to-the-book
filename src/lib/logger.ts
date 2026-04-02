type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (context !== undefined) {
      console[level](formattedMessage, context);
    } else {
      console[level](formattedMessage);
    }
  }

  info(message: string, context?: any) { this.log('info', message, context); }
  warn(message: string, context?: any) { this.log('warn', message, context); }
  error(message: string, context?: any) { this.log('error', message, context); }
  debug(message: string, context?: any) { this.log('debug', message, context); }
}

export const logger = new Logger();
