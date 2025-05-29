import { ethers, Signer } from 'ethers'
import { ConfigHelper } from '../../src/config/index.js'
import { hexlify } from 'ethers/lib/utils.js'
import { createHash } from 'crypto'
import { Aquarius } from '../services/Aquarius.js'
import { NftFactory } from '../contracts/NFTFactory.js'
import { Nft } from '../contracts/NFT.js'
import { DatatokenCreateParams } from '../@types/Datatoken.js'
import { NftCreateData } from '../@types/NFTFactory.js'
import { ZERO_ADDRESS } from './Constants.js'
import { DispenserCreationParams } from '../@types/Dispenser.js'
import { FreCreationParams } from '../@types/FixedPrice.js'
import { getEventFromTx } from './ContractUtils.js'
import { ProviderInstance } from '../services/Provider.js'

import AccessListFactory from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessListFactory.sol/AccessListFactory.json'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'
import { calculateActiveTemplateIndex } from './Addresses.js'
import { DDO, DDOManager } from '@oceanprotocol/ddo-js'
import { FileObjectType } from '../@types'

export const DEVELOPMENT_CHAIN_ID = 8996
// template address OR templateId
export function useOasisSDK(network: string | number): boolean {
  const config = new ConfigHelper().getConfig(network)
  return config && config.sdk === 'oasis'
}

/**
 *
 * @param name asset name
 * @param symbol asse symbol
 * @param owner owner address
 * @param assetUrl asset url, if present and confidential evm, add it to token create params
 * @param templateIDorAddress either template address or id
 * @param ddo ddo
 * @param encryptDDO encrypt or not?
 * @param providerUrl the provider URL
 * @param providerFeeToken the provider fee token
 * @param aquariusInstance aquarius, could be node instance url
 * @param allowAccessList?: string,
 * @param denyAccessList?: string
 * @returns ddo id as string
 */
export async function createAsset(
  name: string,
  symbol: string,
  owner: Signer,
  assetUrl: any, // files object
  templateIDorAddress: string | number, // If string, it's template address , otherwise, it's templateId
  ddo: DDO,
  encryptDDO: boolean = true, // default is true
  providerUrl: string,
  providerFeeToken: string,
  aquariusInstance: Aquarius,
  accessListFactory?: string, // access list factory address
  allowAccessList?: string, // allow list address
  denyAccessList?: string // deny list address
): Promise<string> {
  const ddoInstance = DDOManager.getDDOClass(ddo)
  const { indexedMetadata } = ddoInstance.getAssetFields()
  const value =
    ddoInstance.getDDOData()?.stats?.price?.value ||
    indexedMetadata?.stats[0]?.prices[0]?.price
  let { chainId: ddoChainId, nftAddress } = ddoInstance.getDDOFields()
  const { services } = ddoInstance.getDDOFields()

  const isAddress = typeof templateIDorAddress === 'string'
  const isTemplateIndex = typeof templateIDorAddress === 'number'
  if (!isAddress && !isTemplateIndex) {
    throw new Error('Invalid template! Must be a "number" or a "string"')
  }
  const chainID = (await owner.provider.getNetwork()).chainId

  if (ddoChainId && ddoChainId !== chainID) {
    throw new Error('Chain ID from DDO is different than the configured network.')
  }

  const config = new ConfigHelper().getConfig(parseInt(String(chainID)))

  let templateIndex = await calculateActiveTemplateIndex(
    owner,
    config.nftFactoryAddress,
    templateIDorAddress,
    chainID
  )

  if (templateIndex < 1) {
    // for testing purposes only
    if (chainID === DEVELOPMENT_CHAIN_ID) {
      templateIndex = 1
    } else throw new Error(`Invalid template index: ${templateIndex}`)
  }

  const nft = new Nft(owner, chainID)

  const nftFactory = new NftFactory(config.nftFactoryAddress, owner, chainID)

  // get nft owner
  const account = await owner.getAddress()

  // from hex to number format
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner: account
  }
  const datatokenParams: DatatokenCreateParams = {
    templateIndex,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: account,
    feeToken: providerFeeToken || config.oceanTokenAddress,
    minter: account,
    mpFeeAddress: ZERO_ADDRESS
  }

  if (
    !assetUrl?.files[0].type ||
    ![FileObjectType.ARWEAVE, FileObjectType.IPFS, FileObjectType.URL].includes(
      assetUrl?.files[0]?.type?.toLowerCase()
    )
  ) {
    console.log('Missing or invalid files object type, defaulting to "url"')
    assetUrl.type = FileObjectType.URL
  }
  // include fileObject in the DT constructor
  if (config.sdk === 'oasis') {
    datatokenParams.filesObject = assetUrl
    datatokenParams.accessListFactory = accessListFactory || config.accessListFactory
    datatokenParams.allowAccessList = allowAccessList
    datatokenParams.denyAccessList = denyAccessList
  }

  let bundleNFT
  try {
    if (!value) {
      bundleNFT = await nftFactory.createNftWithDatatoken(nftParamsAsset, datatokenParams)
    } else if (value.toString() === '0') {
      const dispenserParams: DispenserCreationParams = {
        dispenserAddress: config.dispenserAddress,
        maxTokens: '1',
        maxBalance: '100000000',
        withMint: true,
        allowedSwapper: ZERO_ADDRESS
      }
      bundleNFT = await nftFactory.createNftWithDatatokenWithDispenser(
        nftParamsAsset,
        datatokenParams,
        dispenserParams
      )
    } else {
      // fixed price
      const fixedPriceParams: FreCreationParams = {
        fixedRateAddress: config.fixedRateExchangeAddress,
        baseTokenAddress: config.oceanTokenAddress,
        owner: account,
        marketFeeCollector: account,
        baseTokenDecimals: 18,
        datatokenDecimals: 18,
        fixedRate: value.toString(),
        marketFee: '0',
        allowedConsumer: account,
        withMint: true
      }
      bundleNFT = await nftFactory.createNftWithDatatokenWithFixedRate(
        nftParamsAsset,
        datatokenParams,
        fixedPriceParams
      )
    }
  } catch (err) {
    console.log('ERROR creating NFT bundle', err)
    return null
  }

  const trxReceipt = await bundleNFT.wait()
  // events have been emitted
  const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

  const nftAddressFromEvent = nftCreatedEvent.args.newTokenAddress
  const datatokenAddressAsset = tokenCreatedEvent.args.newTokenAddress
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = nftAddressFromEvent

  if (config.sdk === 'oasis') {
    // we need to update files object on the SC otherwise it will fail validation on provider
    // because DDO datatokenAddress and nftAddress will not match the values on files object
    const contract = new ethers.Contract(datatokenAddressAsset, ERC20Template4.abi, owner)
    try {
      const tx = await contract.setFilesObject(
        ethers.utils.toUtf8Bytes(JSON.stringify(assetUrl))
      )
      if (tx.wait) {
        await tx.wait()
      }
    } catch (err) {
      console.log('Error updating files object with data token and nft addresses: ', err)
      return null
    }
  }

  // if confidential EVM no need to make encrypt call here
  if (config.sdk === 'oasis') {
    services[0].files = '' // on confidental EVM it needs to be empty string not null, for schema validation
  } else {
    services[0].files = await ProviderInstance.encrypt(assetUrl, chainID, providerUrl)
  }

  services[0].datatokenAddress = datatokenAddressAsset
  services[0].serviceEndpoint = providerUrl

  nftAddress = nftAddressFromEvent

  const id = ddoInstance.makeDid(nftAddress, ddoChainId.toString())
  ddo = ddoInstance.updateFields({ id, nftAddress }) as DDO

  let metadata
  let metadataHash
  let flags
  if (encryptDDO) {
    metadata = await ProviderInstance.encrypt(ddo, chainID, providerUrl)
    const validateResult = await aquariusInstance.validate(
      ddo,
      owner,
      providerUrl,
      null,
      true
    )
    metadataHash = validateResult.hash
    flags = 2
  } else {
    const stringDDO = JSON.stringify(ddo)
    const bytes = Buffer.from(stringDDO)
    metadata = hexlify(bytes)
    metadataHash = '0x' + createHash('sha256').update(metadata).digest('hex')
    flags = 0
  }

  await nft.setMetadata(
    nftAddress,
    await owner.getAddress(),
    0,
    providerUrl,
    '',
    ethers.utils.hexlify(flags),
    metadata,
    metadataHash
  )
  return ddo.id
}

/**
 * deploy new access list factory if needed
 * @param accessListFactory accessListFactory address
 * @param owner owner account
 * @param addressesList list of addresses to deploy
 * @returns accessListFactory address
 */
export async function createAccessListFactory(
  accessListFactory: string,
  owner: Signer,
  addressesList?: string[]
): Promise<any> {
  const factory = new ethers.Contract(accessListFactory, AccessListFactory.abi, owner)
  const ownerAccount = await owner.getAddress()
  try {
    const accessListTx = await factory.deployAccessListContract(
      'AllowList',
      'ALLOW',
      true,
      ownerAccount,
      addressesList || [ownerAccount],
      ['https://oceanprotocol.com/nft/']
    )
    if (accessListTx && accessListTx.wait) {
      const trxReceipt = await accessListTx.wait()
      const events = getEventFromTx(trxReceipt, 'NewAccessList')
      return events.args[0]
    }
  } catch (error) {
    console.log('ERROR createAccessListFactory(): ', error)
  }
  return null
}
