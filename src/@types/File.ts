export interface HeadersObject {
  [key: string]: string
}

export enum FileObjectType {
  // eslint-disable-next-line no-unused-vars
  URL = 'url',
  // eslint-disable-next-line no-unused-vars
  IPFS = 'ipfs',
  // eslint-disable-next-line no-unused-vars
  ARWEAVE = 'arweave',
  // eslint-disable-next-line no-unused-vars
  S3 = 's3',
  // eslint-disable-next-line no-unused-vars
  FTP = 'ftp'
}

export enum EncryptMethod {
  // eslint-disable-next-line no-unused-vars
  AES = 'AES',
  // eslint-disable-next-line no-unused-vars
  ECIES = 'ECIES'
}

export interface BaseFileObject {
  type: FileObjectType | string
  encryptedBy?: string
  encryptMethod?: EncryptMethod
}

export interface UrlFileObject extends BaseFileObject {
  url: string
  method: string
  headers?: HeadersObject
}

export interface IpfsFileObject extends BaseFileObject {
  hash: string
}

export interface ArweaveFileObject extends BaseFileObject {
  transactionId: string
}

export interface S3Object {
  endpoint: string
  region?: string
  objectKey: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  /** If true, use path-style addressing (e.g. endpoint/bucket/key). Required for some S3-compatible services (e.g. MinIO). Default false (virtual-host style, e.g. bucket.endpoint/key). */
  forcePathStyle?: boolean
}
export interface S3FileObject extends BaseFileObject {
  s3Access: S3Object
}

export interface FtpFileObject extends BaseFileObject {
  /** Full FTP or FTPS URL: ftp://[user:password@]host[:port]/path or ftps://... */
  url: string
}

export type StorageObject =
  | UrlFileObject
  | IpfsFileObject
  | ArweaveFileObject
  | S3FileObject
  | FtpFileObject
