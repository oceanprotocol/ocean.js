import { SHA256 } from 'crypto-js'
import { ethers, Signer } from 'ethers'
import { ConfigHelper } from '../../src/config'
import { hexlify } from 'ethers/lib/utils'
import { createHash } from 'crypto'
import fs from 'fs'

// eslint-disable-next-line import/no-named-default
import { default as Addresses } from '@oceanprotocol/contracts/addresses/address.json'
import { Aquarius } from '../services/Aquarius'
import { NftFactory } from '../contracts/NFTFactory'
import { Nft } from '../contracts/NFT'
import { DatatokenCreateParams } from '../@types/Datatoken'
import { NftCreateData } from '../@types/NFTFactory'
import { ZERO_ADDRESS } from './Constants'
import { DispenserCreationParams } from '../@types/Dispenser'
import { FreCreationParams } from '../@types/FixedPrice'
import { getEventFromTx } from './ContractUtils'
import { ProviderInstance } from '../services/Provider'
// eslint-disable-next-line import/no-named-default
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20Template.sol/IERC20Template.json'
import AccessListFactory from '@oceanprotocol/contracts/artifacts/contracts/accesslists/AccessListFactory.sol/AccessListFactory.json'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'

// import * as hre from 'hardhat'

export const DEVELOPMENT_CHAIN_ID = 8996
// template address OR templateId
export function useOasisSDK(network: string | number): boolean {
  const config = new ConfigHelper().getConfig(network)
  return config && config.sdk === 'oasis'
}

/**
 * Get the artifacts address from the address.json file
 * either from the env or from the ocean-contracts dir
 * @returns data or null
 */
export function getOceanArtifactsAdresses(): any {
  try {
    if (process.env.ADDRESS_FILE) {
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const data = fs.readFileSync(process.env.ADDRESS_FILE, 'utf8')
      return JSON.parse(data)
    }
    return Addresses
  } catch (error) {
    return Addresses
  }
}

/**
 * Get the artifacts address from the address.json file, for the given chain
 * either from the env or from the ocean-contracts dir, safer than above, because sometimes the network name
 * is mispeled, best example "optimism_sepolia" vs "optimism-sepolia"
 * @returns data or null
 */
export function getOceanArtifactsAdressesByChainId(chain: number): any {
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const data = getOceanArtifactsAdresses()
    if (data) {
      const networks = Object.keys(data)
      for (const network of networks) {
        if (data[network].chainId === chain) {
          return data[network]
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
  return null
}

/**
 * Use this function to accurately calculate the template index, and also checking if the template is active
 * @param owner the signer account
 * @param nftContractAddress the nft contract address, usually artifactsAddresses.ERC721Factory
 * @param template the template ID or template address (from smart contract getId() function)
 * @returns index of the template on the list
 */
export async function calculateActiveTemplateIndex(
  owner: Signer,
  nftContractAddress: string, // addresses.ERC721Factory,
  template: string | number
): Promise<number> {
  // is an ID number?
  const isTemplateID = typeof template === 'number'

  const factoryERC721 = new NftFactory(nftContractAddress, owner)
  const currentTokenCount = await factoryERC721.getCurrentTokenTemplateCount()
  for (let i = 1; i <= currentTokenCount; i++) {
    const tokenTemplate = await factoryERC721.getTokenTemplate(i)

    const erc20Template = new ethers.Contract(
      tokenTemplate.templateAddress,
      ERC20Template.abi,
      owner
    )

    // check for ID
    if (isTemplateID) {
      const id = await erc20Template.connect(owner).getId()
      if (tokenTemplate.isActive && id.toString() === template.toString()) {
        return i
      }
    } else if (
      tokenTemplate.isActive &&
      tokenTemplate.templateAddress === template.toString()
    ) {
      return i
    }
  }
  // if nothing is found it returns -1
  return -1
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
  ddo: any,
  encryptDDO: boolean = true, // default is true
  providerUrl: string,
  providerFeeToken: string,
  aquariusInstance: Aquarius,
  accessListFactory?: string, // access list factory address
  allowAccessList?: string, // allow list address
  denyAccessList?: string // deny list address
): Promise<string> {
  const isAddress = typeof templateIDorAddress === 'string'
  const isTemplateIndex = typeof templateIDorAddress === 'number'
  if (!isAddress && !isTemplateIndex) {
    throw new Error('Invalid template! Must be a "number" or a "string"')
  }
  const chainID = (await owner.provider.getNetwork()).chainId

  if (ddo.chainId) {
    if (ddo.chainId !== chainID) {
      throw new Error('Chain ID from DDO is different than the configured network.')
    }
  }

  const config = new ConfigHelper().getConfig(parseInt(String(chainID)))

  let templateIndex = await calculateActiveTemplateIndex(
    owner,
    config.nftFactoryAddress,
    templateIDorAddress
  )

  if (templateIndex < 1) {
    // for testing purposes only
    if (chainID === DEVELOPMENT_CHAIN_ID) {
      templateIndex = 1
    } else throw new Error(`Invalid template index: ${templateIndex}`)
  }

  const nft = new Nft(owner, chainID)

  const nftFactory = new NftFactory(config.nftFactoryAddress, owner)

  // get nft owner
  const account = await owner.getAddress()

  // from hex to number format
  ddo.chainId = parseInt(chainID.toString(10))
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

  // include fileObject in the DT constructor
  if (config.sdk === 'oasis') {
    datatokenParams.filesObject = assetUrl
    datatokenParams.accessListFactory = accessListFactory || config.accessListFactory
    datatokenParams.allowAccessList = allowAccessList
    datatokenParams.denyAccessList = denyAccessList
  }

  let bundleNFT
  try {
    if (!ddo.stats?.price?.value) {
      bundleNFT = await nftFactory.createNftWithDatatoken(nftParamsAsset, datatokenParams)
    } else if (ddo.stats?.price?.value === '0') {
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
        fixedRate: ddo.stats.price.value,
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

  const nftAddress = nftCreatedEvent.args.newTokenAddress
  const datatokenAddressAsset = tokenCreatedEvent.args.newTokenAddress
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = nftAddress

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
    ddo.services[0].files = '' // on confidental EVM it needs to be empty string not null, for schema validation
  } else {
    ddo.services[0].files = await ProviderInstance.encrypt(assetUrl, chainID, providerUrl)
  }

  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl

  ddo.nftAddress = nftAddress
  ddo.id = 'did:op:' + SHA256(ethers.utils.getAddress(nftAddress) + chainID.toString(10))

  let metadata
  let metadataHash
  let flags
  if (encryptDDO) {
    metadata = await ProviderInstance.encrypt(ddo, chainID, providerUrl)
    const validateResult = await aquariusInstance.validate(ddo)
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
