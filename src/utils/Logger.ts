export enum LogLevel {
    None = -1,
    Error = 0,
    Warn = 1,
    Log = 2,
    Verbose = 3
}

export class Logger {
    constructor(private logLevel: LogLevel = LogLevel.Verbose) {}

    public setLevel(logLevel: LogLevel) {
        this.logLevel = logLevel
    }

    public bypass(...args: any[]) {
        this.dispatch('log', -Infinity as any, ...args)
    }

    public debug(...args: any[]) {
        this.dispatch('debug', LogLevel.Verbose, ...args)
    }

    public log(...args: any[]) {
        this.dispatch('log', LogLevel.Log, ...args)
    }

    public warn(...args: any[]) {
        this.dispatch('warn', LogLevel.Warn, ...args)
    }

    public error(...args: any[]) {
        this.dispatch('error', LogLevel.Error, ...args)
    }

    private dispatch(verb: string, level: LogLevel, ...args: any[]) {
        if (this.logLevel >= level) {
            console[verb](...args) // eslint-disable-line
        }
    }
}

export const LoggerInstance = new Logger()
export default LoggerInstance
