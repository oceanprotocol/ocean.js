import crypto from 'crypto-js'
import { ethers, Signer } from 'ethers'
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
  ProviderFees,
  getEventFromTx
} from '../../src/index.js'
import { DDO } from '@oceanprotocol/ddo-js'
// superseed by src/utils/CreateAsset
export async function createAssetHelper(
  name: string,
  symbol: string,
  owner: Signer,
  assetUrl: any,
  ddo: DDO,
  providerUrl: string,
  nftContractAddress: string, // addresses.ERC721Factory,
  aquariusInstance: Aquarius
) {
  const nft = new Nft(owner, (await owner.provider.getNetwork()).chainId)

  const nftFactory = new NftFactory(nftContractAddress, owner)

  const chain = (await owner.provider.getNetwork()).chainId

  ddo.chainId = parseInt(chain.toString(10))
  const nftParamsAsset: NftCreateData = {
    name,
    symbol,
    templateIndex: 1,
    tokenURI: 'aaa',
    transferable: true,
    owner: await owner.getAddress()
  }
  const datatokenParams: DatatokenCreateParams = {
    templateIndex: 1,
    cap: '100000',
    feeAmount: '0',
    paymentCollector: ZERO_ADDRESS,
    feeToken: ZERO_ADDRESS,
    minter: await owner.getAddress(),
    mpFeeAddress: ZERO_ADDRESS
  }

  const bundleNFT = await nftFactory.createNftWithDatatoken(
    nftParamsAsset,
    datatokenParams,
    false
  )

  const trxReceipt = await bundleNFT.wait()
  // events have been emitted
  const nftCreatedEvent = getEventFromTx(trxReceipt, 'NFTCreated')
  const tokenCreatedEvent = getEventFromTx(trxReceipt, 'TokenCreated')

  const nftAddress = nftCreatedEvent.args.newTokenAddress
  const datatokenAddressAsset = tokenCreatedEvent.args.newTokenAddress
  // create the files encrypted string
  assetUrl.datatokenAddress = datatokenAddressAsset
  assetUrl.nftAddress = nftAddress
  ddo.services[0].files = await ProviderInstance.encrypt(assetUrl, chain, providerUrl)
  ddo.services[0].datatokenAddress = datatokenAddressAsset
  ddo.services[0].serviceEndpoint = providerUrl

  ddo.nftAddress = nftAddress
  ddo.id =
    'did:op:' + crypto.SHA256(ethers.utils.getAddress(nftAddress) + chain.toString(10))

  const encryptedResponse = await ProviderInstance.encrypt(ddo, chain, providerUrl)
  const validateResult = await aquariusInstance.validate(ddo, owner, providerUrl, null, true)
  await nft.setMetadata(
    nftAddress,
    await owner.getAddress(),
    0,
    providerUrl,
    '',
    ethers.utils.hexlify(2),
    encryptedResponse,
    validateResult.hash
  )
  return ddo.id
}

export async function updateAssetMetadata(
  owner: Signer,
  updatedDdo: DDO,
  providerUrl: string,
  aquariusInstance: Aquarius
) {
  const nft = new Nft(owner, (await owner.provider.getNetwork()).chainId)
  const providerResponse = await ProviderInstance.encrypt(
    updatedDdo,
    updatedDdo.chainId,
    providerUrl
  )
  const encryptedResponse = await providerResponse
  const validateResult = await aquariusInstance.validate(updatedDdo, owner, providerUrl, null, true)
  const updateDdoTX = await nft.setMetadata(
    updatedDdo.nftAddress,
    await owner.getAddress(),
    0,
    providerUrl,
    '',
    ethers.utils.hexlify(2),
    encryptedResponse,
    validateResult.hash
  )
  return updateDdoTX
}

export async function handleComputeOrder(
  order: ProviderComputeInitialize,
  datatokenAddress: string,
  payerAccount: Signer,
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
  const chainID = (await payerAccount.provider.getNetwork()).chainId
  if (config.chainId !== chainID) {
    throw new Error('Chain ID from DDO is different than the configured network.')
  }
  const hasProviderFees = order.providerFee && order.providerFee.providerFeeAmount
  if (hasProviderFees && Number(order.providerFee.providerFeeAmount) > 0) {
    await approveWei(
      payerAccount,
      config,
      await payerAccount.getAddress(),
      order.providerFee.providerFeeToken,
      datatokenAddress,
      order.providerFee.providerFeeAmount
    )
  }
  if (order.validOrder) {
    if (!order.providerFee) return order.validOrder
    const tx = await datatoken.reuseOrder(
      datatokenAddress,
      order.validOrder,
      order.providerFee
    )
    const reusedTx = await tx.wait()
    const orderReusedTx = getEventFromTx(reusedTx, 'OrderReused')
    return orderReusedTx.transactionHash
  }
  const tx = await datatoken.startOrder(
    datatokenAddress,
    consumerAccount,
    serviceIndex,
    order.providerFee,
    consumeMarkerFee
  )
  const orderTx = await tx.wait()
  const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
  return orderStartedTx.transactionHash
}

export async function orderAsset(
  did: string,
  datatokenAddress: string,
  consumerAccount: string,
  serviceId: string,
  serviceIndex: number,
  datatoken: Datatoken,
  providerUrl: string
) {
  const initializeData = await ProviderInstance.initialize(
    did,
    serviceId,
    serviceIndex,
    consumerAccount,
    providerUrl
  )

  const providerFees: ProviderFees = {
    providerFeeAddress: initializeData.providerFee.providerFeeAddress,
    providerFeeToken: initializeData.providerFee.providerFeeToken,
    providerFeeAmount: initializeData.providerFee.providerFeeAmount,
    v: initializeData.providerFee.v,
    r: initializeData.providerFee.r,
    s: initializeData.providerFee.s,
    providerData: initializeData.providerFee.providerData,
    validUntil: initializeData.providerFee.validUntil
  }

  // make the payment
  const tx = await datatoken.startOrder(
    datatokenAddress,
    consumerAccount,
    0,
    providerFees
  )
  const orderTx = await tx.wait()
  const orderStartedTx = getEventFromTx(orderTx, 'OrderStarted')
  return orderStartedTx
}
