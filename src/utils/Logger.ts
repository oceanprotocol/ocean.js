export enum LogLevel {
  None = -1,
  Error = 0,
  Warn = 1,
  Log = 2,
  Verbose = 3
}

export class Logger {
  constructor(private logLevel: LogLevel = LogLevel.Error) {}

  public setLevel(logLevel: LogLevel): void {
    this.logLevel = logLevel
  }

  public bypass(...args: any[]): void {
    this.dispatch('log', -Infinity as any, ...args)
  }

  public debug(...args: any[]): void {
    this.dispatch('debug', LogLevel.Verbose, ...args)
  }

  public log(...args: any[]): void {
    this.dispatch('log', LogLevel.Log, ...args)
  }

  public warn(...args: any[]): void {
    this.dispatch('warn', LogLevel.Warn, ...args)
  }

  public error(...args: any[]): void {
    this.dispatch('error', LogLevel.Error, ...args)
  }

  private dispatch(verb: string, level: LogLevel, ...args: any[]) {
    if (this.logLevel >= level) {
      console[verb](...args)
    }
  }
}

export const LoggerInstance = new Logger()
export default LoggerInstance
