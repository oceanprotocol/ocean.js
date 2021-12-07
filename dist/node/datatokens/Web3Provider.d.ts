import Web3 from 'web3';
import Config from '../models/Config';
export default class Web3Provider {
    static getWeb3(config?: Partial<Config>): Web3;
}
