import { SHA256 } from 'crypto-js'
import {
  Aquarius,
  DatatokenCreateParams,
  Nft,
  NftCreateData,
  NftFactory,
  ProviderInstance,
  ZERO_ADDRESS,
  approveWei,
  ProviderComputeInitialize,
  ConsumeMarketFee,
  Datatoken,
  Config,
  DDO,
  ProviderFees
} from '../../src'
import { web3 } from '../config'

export async function createAsset(
  name: string,
  symbol: string,
  owner: string,
  assetUrl: any,
  ddo: any,
  providerUrl: string,
  nftContractAddress: string, // addresses.ERC721Factory,
  aquariusInstance: Aquarius
) {
  const nft = new Nft(web3)
  const Factory = new NftFactory(nftContractAddress, web3)

  const chain = await web3.eth.getChainId()
  ddo.chainId = parseInt(chain.toString(10))
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner
  }
  const datatokenParams: DatatokenCreateParams = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: owner,
    mpFeeAddress: ZERO_ADDRESS
  }

  const result = await Factory.createNftWithDatatoken(
    owner,
    nftParamsAsset,
    datatokenParams
  )

  const nftAddress = result.events.NFTCreated.returnValues[0]
  const datatokenAddressAsset = result.events.TokenCreated.returnValues[0]
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = ddo.nftAddress
  let providerResponse = await ProviderInstance.encrypt(assetUrl, providerUrl)
  ddo.services[0].files = await providerResponse
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl
  // update ddo and set the right did
  ddo.nftAddress = web3.utils.toChecksumAddress(nftAddress)
  ddo.id =
    'did:op:' + SHA256(web3.utils.toChecksumAddress(nftAddress) + chain.toString(10))
  providerResponse = await ProviderInstance.encrypt(ddo, providerUrl)
  const encryptedResponse = await providerResponse
  const validateResult = await aquariusInstance.validate(ddo)
  await nft.setMetadata(
    nftAddress,
    owner,
    0,
    providerUrl,
    '',
    '0x2',
    encryptedResponse,
    validateResult.hash
  )
  return ddo.id
}

export async function updateAssetMetadata(
  owner: string,
  updatedDdo: DDO,
  providerUrl: string,
  aquariusInstance: Aquarius
) {
  const nft = new Nft(web3)
  const providerResponse = await ProviderInstance.encrypt(updatedDdo, providerUrl)
  const encryptedResponse = await providerResponse
  const validateResult = await aquariusInstance.validate(updatedDdo)
  const updateDdoTX = await nft.setMetadata(
    updatedDdo.nftAddress,
    owner,
    0,
    providerUrl,
    '',
    '0x2',
    encryptedResponse,
    validateResult.hash
  )
  return updateDdoTX
}

export async function handleComputeOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: string,
  consumerAccount: string,
  serviceIndex: number,
  datatoken: Datatoken,
  config: Config,
  consumeMarkerFee?: ConsumeMarketFee
) {
  /* We do have 3 possible situations:
       - have validOrder and no providerFees -> then order is valid, providerFees are valid, just use it in startCompute
       - have validOrder and providerFees -> then order is valid but providerFees are not valid, we need to call reuseOrder and pay only providerFees
       - no validOrder -> we need to call startOrder, to pay 1 DT & providerFees
    */
  if (order.providerFee && order.providerFee.providerFeeAmount) {
    await approveWei(
      web3,
      config,
      payerAccount,
      order.providerFee.providerFeeToken,
      datatokenAddress,
      order.providerFee.providerFeeAmount
    )
  }
  if (order.validOrder) {
    if (!order.providerFee) return order.validOrder
    const tx = await datatoken.reuseOrder(
      datatokenAddress,
      payerAccount,
      order.validOrder,
      order.providerFee
    )
    return tx.transactionHash
  }
  const tx = await datatoken.startOrder(
    datatokenAddress,
    payerAccount,
    consumerAccount,
    serviceIndex,
    order.providerFee,
    consumeMarkerFee
  )
  return tx.transactionHash
}

export async function orderAsset(
  did: string,
  datatokenAddress: string,
  consumerAccount: string,
  serviceId: string,
  serviceIndex: number,
  datatoken: Datatoken,
  config: Config
) {
  const initializeData = await ProviderInstance.initialize(
    did, // resolvedDdoAfterUpdate.id,
    serviceId, // resolvedDdoAfterUpdate.services[0].id,
    serviceIndex,
    consumerAccount,
    config.providerUri
  )
  console.log(`initializeData for did:${did} == ${initializeData}`)
  const providerFees: ProviderFees = {
    providerFeeAddress: initializeData?.providerFee?.providerFeeAddress,
    providerFeeToken: initializeData?.providerFee?.providerFeeToken,
    providerFeeAmount: initializeData?.providerFee?.providerFeeAmount,
    v: initializeData?.providerFee?.v,
    r: initializeData?.providerFee?.r,
    s: initializeData?.providerFee?.s,
    providerData: initializeData?.providerFee?.providerData,
    validUntil: initializeData?.providerFee?.validUntil
  }

  // make the payment
  const orderTx = await datatoken.startOrder(
    datatokenAddress, // resolvedDdoAfterUpdate.services[0].datatokenAddress,
    consumerAccount,
    consumerAccount,
    0,
    providerFees
  )
  return orderTx
}
