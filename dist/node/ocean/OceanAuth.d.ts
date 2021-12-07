import Account from './Account';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export declare class OceanAuth extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<OceanAuth>;
    get(account: Account): Promise<string>;
    check(token: string): Promise<string>;
    store(account: Account): Promise<void>;
    restore(account: Account): Promise<string>;
    isStored(account: Account): Promise<boolean>;
    private writeToken;
    private readToken;
    private getLocalStorage;
    private getMessage;
    private getExpiration;
}
