export declare class SubscribableObserver<T, P> {
    completed: boolean;
    private subscriptions;
    subscribe(onNext?: (next: T) => void, onComplete?: (complete: P) => void, onError?: (error: any) => void): {
        unsubscribe: () => boolean;
    };
    next(next?: T): void;
    complete(resolve?: P): void;
    error(error?: any): void;
    private emit;
    private unsubscribe;
}
