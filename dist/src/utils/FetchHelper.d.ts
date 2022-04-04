import { DownloadResponse } from '../@types/DownloadResponse';
export declare function fetchData(url: string, opts: RequestInit): Promise<Response>;
export declare function downloadFileBrowser(url: string): Promise<void>;
export declare function downloadFile(url: string, index?: number): Promise<DownloadResponse>;
export declare function getData(url: string): Promise<Response>;
export declare function postData(url: string, payload: BodyInit): Promise<Response>;
