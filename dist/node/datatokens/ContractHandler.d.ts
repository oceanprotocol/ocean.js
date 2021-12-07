import { Contract } from 'web3-eth-contract';
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export default class ContractHandler extends Instantiable {
    protected static getContract(what: string, networkId: number): Contract;
    protected static setContract(what: string, networkId: number, contractInstance: Contract): void;
    protected static hasContract(what: string, networkId: number): boolean;
    private static contracts;
    private static getHash;
    constructor(config: InstantiableConfig);
    get(what: string, optional?: boolean): Promise<Contract>;
    private load;
}
