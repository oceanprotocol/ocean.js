import { assert } from 'chai'
import { SHA256 } from 'crypto-js'
import {
  approve,
  Aquarius,
  Config,
  Datatoken,
  downloadFile,
  Erc20CreateParams,
  getHash,
  Nft,
  NftCreateData,
  NftFactory,
  Pool,
  PoolCreationParams,
  ProviderFees,
  ProviderInstance,
  ZERO_ADDRESS
} from '../../src'
import { getTestConfig, web3 } from '../config'
import { Addresses, deployContracts } from '../TestContractHandler'

const assetUrl = [
  {
    type: 'url',
    url: 'https://raw.githubusercontent.com/oceanprotocol/testdatasets/main/shs_dataset_test.txt',
    method: 'GET'
  }
]

const ddo = {
  '@context': ['https://w3id.org/did/v1'],
  id: '',
  version: '4.0.0',
  chainId: 4,
  nftAddress: '0x0',
  metadata: {
    created: '2021-12-20T14:35:20Z',
    updated: '2021-12-20T14:35:20Z',
    type: 'dataset',
    name: 'dataset-name',
    description: 'Ocean protocol test dataset description',
    author: 'oceanprotocol-team',
    license: 'MIT'
  },
  services: [
    {
      id: 'testFakeId',
      type: 'access',
      files: '',
      datatokenAddress: '0x0',
      serviceEndpoint: 'https://providerv4.rinkeby.oceanprotocol.com',
      timeout: 0
    }
  ]
}

describe('Marketplace flow tests', async () => {
  let config: Config
  let aquarius: Aquarius
  let providerUrl: any
  let publisherAccount: string
  let consumerAccount: string
  let contracts: Addresses

  before(async () => {
    const accounts = await web3.eth.getAccounts()
    publisherAccount = accounts[0]
    consumerAccount = accounts[1]

    console.log(`Publisher account address: ${publisherAccount}`)
    console.log(`Consumer account address: ${consumerAccount}`)

    config = await getTestConfig(web3)
    aquarius = new Aquarius(config.metadataCacheUri)
    providerUrl = 'http://127.0.0.1:8030' // config.providerUri

    console.log(`Aquarius URL: ${config.metadataCacheUri}`)
    console.log(`Provider URL: ${providerUrl}`)

    contracts = await deployContracts(web3, publisherAccount)

    await approve(
      web3,
      publisherAccount,
      contracts.oceanAddress,
      contracts.erc721FactoryAddress,
      '10000'
    )
  })

  it('should publish a dataset (create NFT + ERC20)', async () => {
    const nft = new Nft(web3)
    const datatoken = new Datatoken(web3)
    const factory = new NftFactory(contracts.erc721FactoryAddress, web3)

    const nftParams: NftCreateData = {
      name: 'Datatoken 1',
      symbol: 'DT1',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: publisherAccount
    }

    const erc20Params: Erc20CreateParams = {
      templateIndex: 1,
      cap: '100000',
      feeAmount: '0',
      paymentCollector: ZERO_ADDRESS,
      feeToken: ZERO_ADDRESS,
      minter: publisherAccount,
      mpFeeAddress: ZERO_ADDRESS
    }

    const poolParams: PoolCreationParams = {
      ssContract: contracts.sideStakingAddress,
      baseTokenAddress: contracts.oceanAddress,
      baseTokenSender: contracts.erc721FactoryAddress,
      publisherAddress: publisherAccount,
      marketFeeCollector: publisherAccount,
      poolTemplateAddress: contracts.poolTemplateAddress,
      rate: '1',
      baseTokenDecimals: 18,
      vestingAmount: '10000',
      vestedBlocks: 2500000,
      initialBaseTokenLiquidity: '2000',
      swapFeeLiquidityProvider: '0.001',
      swapFeeMarketRunner: '0.001'
    }

    const tx = await factory.createNftErc20WithPool(
      publisherAccount,
      nftParams,
      erc20Params,
      poolParams
    )

    const erc721Address = tx.events.NFTCreated.returnValues[0]
    const datatokenAddress = tx.events.TokenCreated.returnValues[0]
    const poolAdress = tx.events.NewPool.returnValues[0]

    console.log(`NFT address: ${erc721Address}`)
    console.log(`Datatoken address: ${datatokenAddress}`)
    console.log(`Pool address: ${poolAdress}`)

    // update ddo and set the right did
    ddo.chainId = await web3.eth.getChainId()
    ddo.id =
      'did:op:' +
      SHA256(web3.utils.toChecksumAddress(erc721Address) + ddo.chainId.toString(10))
    ddo.nftAddress = erc721Address
    // encrypt file(s) using provider
    const encryptedFiles = await ProviderInstance.encrypt(assetUrl, providerUrl)
    ddo.services[0].files = await encryptedFiles
    ddo.services[0].datatokenAddress = datatokenAddress

    console.log(`DID: ${ddo.id}`)

    // Marketplace displays asset for sale
    const pool = new Pool(web3)
    const prices = await pool.getAmountInExactOut(
      poolAdress,
      datatokenAddress,
      contracts.oceanAddress,
      '1',
      '0.01'
    )
    console.log(prices)
    console.log(`Price of 1 ${nftParams.symbol} is ${prices.tokenAmount}`)
  })
})
