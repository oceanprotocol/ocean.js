import { Asset, DDO, ValidateMetadata } from '../@types/';
export declare class Aquarius {
    aquariusURL: any;
    /**
     * Instantiate Aquarius
     * @param {String} aquariusURL
     */
    constructor(aquariusURL: string);
    /** Resolves a DID
     * @param {string} did
     * @param {AbortSignal} signal abort signal
     * @return {Promise<Asset>} Asset
     */
    resolve(did: string, signal?: AbortSignal): Promise<Asset>;
    /**
     * Blocks until Aqua will cache the did (or the update for that did) or timeouts
     
     * @param {string} did DID of the asset.
     * @param {string} txid used when the did exists and we expect an update with that txid.
       * @param {AbortSignal} signal abort signal
     * @return {Promise<DDO>} DDO of the asset.
     */
    waitForAqua(did: string, txid?: string, signal?: AbortSignal): Promise<Asset>;
    /**
     * Validate DDO content
     * @param {DDO} ddo DID Descriptor Object content.
     * @param {AbortSignal} signal abort signal
     * @return {Promise<ValidateMetadata>}.
     */
    validate(ddo: DDO, signal?: AbortSignal): Promise<ValidateMetadata>;
}
export default Aquarius;
