import { Instantiable, InstantiableConfig } from '../../Instantiable.abstract';
import { SignatureUtils } from './SignatureUtils';
import { WebServiceConnector } from './WebServiceConnector';
export declare class OceanUtils extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<OceanUtils>;
    signature: SignatureUtils;
    fetch: WebServiceConnector;
}
