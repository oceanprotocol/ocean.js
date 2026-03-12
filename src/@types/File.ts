export interface HeadersObject {
  [key: string]: string
}

export enum EncryptMethod {
  // eslint-disable-next-line no-unused-vars
  AES = 'AES',
  // eslint-disable-next-line no-unused-vars
  ECIES = 'ECIES'
}

export interface BaseFileObject {
  type: string
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

/*

interface FileTypeHeaders {
  [key: string]: string
}

export interface UrlFile {
  type: 'url'

  /**
   * File index.
   * @type {number}
   *
  index?: number

  /**
   * File URL.
   * @type {string}
   *
  url: string

  /**
   * HTTP method used
   * @type {string}
   *
  method: string

  /**
   * Headers key value pairs associated with the asset GET request
   * @type {string}
   *
  headers?: FileTypeHeaders
}
// put back one Ocean Node will support Graphql storage types
// export interface GraphqlQuery {
//   type: 'graphql'

//   /**
//    * @type {number}
//    *
//   index?: number

//   /**
//    * Endpoint URL
//    * @type {string}
//    *
//   url: string

//   /**
//    * query
//    * @type {string}
//    *
//   query: string

//   /**
//    * Headers key value pairs associated with the asset GET request
//    * @type {string}
//    *
//   headers?: FileTypeHeaders
// }

export interface Arweave {
  type: 'arweave'

  /**
   * transactionId
   * @type {string}
   *
  transactionId: string
}

export interface Ipfs {
  type: 'ipfs'

  /**
   * hash
   * @type {string}
   *
  hash: string
}

// put back one Ocean Node will support Smartcontract storage types
// export interface Smartcontract {
//   type: 'smartcontract'

//   /**
//    * Smartcontract address
//    * @type {string}
//    *
//   address: string

//   /**
//    * ChainId
//    * @type {number}
//    *
//   chainId: number

//   /**
//    * Function ABI (not the entire smartcontract abi)
//    * @type {AbiItem}
//    *
//   abi: AbiItem
// }

export interface Files {
  nftAddress: string
  datatokenAddress: string
  files: UrlFile[] | Arweave[] | Ipfs[]
}
*/
