import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export default class Account extends Instantiable {
    private id;
    private password?;
    private token?;
    constructor(id?: string, config?: InstantiableConfig);
    getId(): string;
    setId(id: string): void;
    setPassword(password: string): void;
    getPassword(): string;
    getTokenBalance(TokenAdress: string): Promise<string>;
    getTokenDecimals(TokenAdress: string): Promise<number>;
    getOceanBalance(): Promise<string>;
    getTokenSymbol(TokenAdress: string): Promise<string>;
    getEtherBalance(): Promise<string>;
}
