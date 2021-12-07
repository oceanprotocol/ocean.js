import Web3 from 'web3';
import { Logger } from '../../utils';
import { Account } from '../../lib';
export declare class SignatureUtils {
    private web3;
    private logger;
    constructor(web3: Web3, logger: Logger);
    signText(text: string, publicKey: string, password?: string): Promise<string>;
    signWithHash(text: string, publicKey: string, password?: string): Promise<string>;
    verifyText(text: string, signature: string): Promise<string>;
    getHash(message: string): Promise<string>;
    signForAquarius(message: string, account: Account): Promise<string>;
}
