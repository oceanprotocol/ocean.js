import { Instantiable } from '../Instantiable.abstract';
export declare class Network extends Instantiable {
    getNetworkId(): Promise<number>;
    getNetworkName(): Promise<string>;
}
