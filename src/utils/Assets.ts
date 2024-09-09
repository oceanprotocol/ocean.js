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
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'

// import * as hre from 'hardhat'

export const DEVELOPMENT_CHAIN_ID = 8996
// template address OR templateId
export function isConfidentialEVM(network: string | number): boolean {
  const config = new ConfigHelper().getConfig(network)
  return config && config.confidentialEVM
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

export async function calculateTemplateIndex(
  chainID: number,
  template: string | number
): Promise<number> {
  let index = -1
  const artifacts = await getOceanArtifactsAdressesByChainId(chainID)
  if (artifacts) {
    const templatesAvailable = artifacts.ERC20Template
    if (templatesAvailable) {
      // template address?
      if (typeof template === 'string') {
        const templateAddresses: any[] = Object.values(templatesAvailable)
        index = templateAddresses.findIndex(function (item) {
          return item === template
        })
      } else {
        const templateIndexes = Object.keys(templatesAvailable)
        index = templateIndexes.findIndex(function (item) {
          return item.indexOf(template.toString()) !== -1
        })
      }
      if (index !== -1) {
        index += 1
      }
    }
  }
  return index
}
// TODO: this for checking if is actually ACTIVE
/**
 * 
    const currentTokenCount = await factoryERC721.connect(owner).getCurrentTemplateCount(options);
    for(i=1;i<=currentTokenCount;i++){
        const tokenTemplate = await factoryERC721.connect(owner).getTokenTemplate(i,options);
        console.log("\n\n------------\ntemplateIndex:"+i)
        console.log(tokenTemplate)
        const erc20Template = await ethers.getContractAt("ERC20Template", tokenTemplate["templateAddress"]);
        const id=await erc20Template.connect(owner).getId()
        console.log("templateId: "+id)
        if(tokenTemplate.isActive && id==SEARCHED_TEMPLATE_ID || tokenTemplate["templateAddress"]==SEARCHED_TEMPLATE_ADDRESS){
                               return i
        }
    }
    return null     
    ```
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
    console.log('\n\n------------\ntemplateIndex:' + i)
    console.log(tokenTemplate)

    // const artifact = await hre.artifacts.readArtifact('ERC20Template')
    const erc20Template = new ethers.Contract(
      tokenTemplate.templateAddress,
      ERC20Template.abi,
      owner
    )
    console.log('erc20Template: ', erc20Template)

    // check for ID
    if (isTemplateID) {
      const id = await erc20Template.connect(owner).getId()
      console.log('templateId: ' + id)
      if (tokenTemplate.isActive && id.toString() === template) {
        return i
      }
    } else if (tokenTemplate.isActive && tokenTemplate.templateAddress === template) {
      return i
    }
  }
  return -1
}
/**
 *
 * @param name asset name
 * @param symbol asse symbol
 * @param owner owner address
 * @param assetUrl asset url
 * @param templateIndex 1,2 or 4
 * @param ddo ddo
 * @param encryptDDO encrypt or not?
 * @param providerUrl the provider URL
 * @param providerFeeToken the provider fee token
 * @param nftContractAddress the nft contract address
 * @param aquariusInstance aquarius, could be node instance url
 * @param dispenserAddress dispenser address
 * @param fixedRateAddress fixed rate exchange address
 * @param baseTokenAddress base token address (ocean)
 * @returns ddo id as string
 */
export async function createAsset(
  name: string,
  symbol: string,
  owner: Signer,
  assetUrl: any,
  template: string | number, // If string, it's template address , otherwise, it's templateId
  ddo: any,
  encryptDDO: boolean = true, // default is true
  providerUrl: string,
  providerFeeToken: string,
  nftContractAddress: string, // addresses.ERC721Factory,
  aquariusInstance: Aquarius,
  filesObject?: any
  // fixed rate
  // dispenserAddress?: string,
  // fixedRateAddress?: string,
  // baseTokenAddress?: string // ocean token?
): Promise<string> {
  const isAddress = typeof template === 'string'
  const isTemplateIndex = typeof template === 'number'
  if (!isAddress && !isTemplateIndex) {
    throw new Error('Invalid template! Must be a "number" or a "string"')
  }
  const chainID = (await owner.provider.getNetwork()).chainId

  const config = new ConfigHelper().getConfig(parseInt(String(chainID)))

  // let templateIndex = await calculateTemplateIndexOld(chainID, template)

  let templateIndex = await calculateActiveTemplateIndex(
    owner,
    nftContractAddress,
    template
  )
  console.log('first template index:', templateIndex)
  // console.log('last template index:', templateIndexV2)
  if (templateIndex < 1) {
    // for testing purposes only
    if (chainID === DEVELOPMENT_CHAIN_ID) {
      templateIndex = 1
    } else throw new Error(`Invalid template index: ${templateIndex}`)
  }

  const nft = new Nft(owner, chainID)

  const nftFactory = new NftFactory(nftContractAddress, owner)

  // get nft owner
  const account = await owner.getAddress()

  // from hex to number format
  ddo.chainId = parseInt(chainID.toString(10))
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex,
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
  if (config.confidentialEVM) {
    datatokenParams.filesObject = filesObject
  }

  let bundleNFT

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

  const trxReceipt = await bundleNFT.wait()
  // events have been emitted
  const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

  const nftAddress = nftCreatedEvent.args.newTokenAddress
  const datatokenAddressAsset = tokenCreatedEvent.args.newTokenAddress
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = nftAddress
  // TODO if template 4 no need to encrypt it??
  if (config.confidentialEVM) {
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
