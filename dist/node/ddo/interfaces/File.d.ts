export interface File {
    name?: string;
    url?: string;
    index?: number;
    contentType: string;
    checksum?: string;
    checksumType?: string;
    contentLength?: string;
    resourceId?: string;
    encoding?: string;
    compression?: string;
    valid?: boolean;
}
