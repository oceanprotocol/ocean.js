import { DDO } from '../ddo/DDO';
import { Ocean } from '../ocean/Ocean';
export interface AssetResolved {
    did: string;
    ddo: DDO;
}
export declare function isDdo(arg: any): arg is DDO;
export declare function assetResolve(asset: DDO | string, ocean: Ocean): Promise<AssetResolved>;
