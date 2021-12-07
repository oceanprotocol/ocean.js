export default class DID {
    static parse(didString: string | DID): DID;
    static generate(dataTokenAddress: string): DID;
    private id;
    private constructor();
    getDid(): string;
    getId(): string;
}
