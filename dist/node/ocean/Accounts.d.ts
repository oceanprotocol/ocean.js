import Account from './Account';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export declare class Accounts extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<Accounts>;
    list(): Promise<Account[]>;
    getTokenBalance(TokenAddress: string, account: Account): Promise<string>;
    getOceanBalance(account: Account): Promise<string>;
    getEtherBalance(account: Account): Promise<string>;
}
