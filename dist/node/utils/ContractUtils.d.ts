import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { ConfigHelperConfig } from './ConfigHelper';
export declare function getFairGasPrice(web3: Web3, config: ConfigHelperConfig): Promise<string>;
export declare function setContractDefaults(contract: Contract, config: ConfigHelperConfig): Contract;
