import Web3 from 'web3';
export declare function signText(web3: Web3, text: string, publicKey: string, password?: string): Promise<string>;
export declare function signHash(web3: Web3, message: string, address: string): Promise<{
    v: string;
    r: string;
    s: string;
}>;
export declare function signWithHash(web3: Web3, text: string, publicKey: string, password?: string): Promise<string>;
