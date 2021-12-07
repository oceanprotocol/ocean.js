import { SubscribableObserver } from './SubscribableObserver';
export declare class SubscribablePromise<T extends any, P extends any> {
    private observer;
    private promise;
    constructor(executor: (observer: SubscribableObserver<T, P>) => void | Promise<P>);
    subscribe(onNext: (next: T) => void): {
        unsubscribe: () => boolean;
    };
    next(onNext: (next: T) => void): this;
    then(onfulfilled?: (value: P) => any, onrejected?: (error: any) => any): Promise<any> & this;
    catch(onrejected?: (error: any) => any): Promise<any> & this;
    finally(onfinally?: () => any): Promise<P> & this;
    private init;
}
