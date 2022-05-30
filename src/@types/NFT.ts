import { MetadataProof } from '..'

export interface MetadataAndTokenURI {
  metaDataState: number
  metaDataDecryptorUrl: string
  metaDataDecryptorAddress: string
  flags: string
  data: string
  metaDataHash: string
  tokenId: number
  tokenURI: string
  metadataProofs?: MetadataProof[]
}

export interface NftRoles {
  manager: boolean
  deployERC20: boolean
  updateMetadata: boolean
  store: boolean
}
