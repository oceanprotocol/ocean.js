import { Response } from 'node-fetch';
import { Logger } from '../../utils';
export declare class WebServiceConnector {
    logger: Logger;
    constructor(logger: Logger);
    post(url: string, payload: BodyInit): Promise<Response>;
    postWithOctet(url: string, payload: BodyInit): Promise<Response>;
    postWithHeaders(url: string, payload: BodyInit, headers: any): Promise<Response>;
    get(url: string): Promise<Response>;
    put(url: string, payload: BodyInit): Promise<Response>;
    delete(url: string, payload?: BodyInit): Promise<Response>;
    downloadFile(url: string, destination?: string, index?: number): Promise<string>;
    downloadFileBrowser(url: string): Promise<void>;
    private fetch;
}
