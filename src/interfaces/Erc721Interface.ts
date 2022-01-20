export interface MetaDataAndTokenURI {
  metaDataState: number
  metaDataDecryptorUrl: string
  metaDataDecryptorAddress: string
  flags: string
  data: string
  metaDataHash: string
  tokenId: number
  tokenURI: string
  metadataProofs: MetadataProof[]
}
