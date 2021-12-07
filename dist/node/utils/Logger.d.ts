export declare enum LogLevel {
    None = -1,
    Error = 0,
    Warn = 1,
    Log = 2,
    Verbose = 3
}
export declare class Logger {
    private logLevel;
    constructor(logLevel?: LogLevel);
    setLevel(logLevel: LogLevel): void;
    bypass(...args: any[]): void;
    debug(...args: any[]): void;
    log(...args: any[]): void;
    warn(...args: any[]): void;
    error(...args: any[]): void;
    private dispatch;
}
export declare const LoggerInstance: Logger;
export default LoggerInstance;
