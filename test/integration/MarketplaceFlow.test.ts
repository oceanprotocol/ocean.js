import Web3 from 'web3'
import { assert, expect } from 'chai'
import { sha256 } from 'js-sha256'
import { AbiItem } from 'web3-utils'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import OPFCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { Erc20CreateParams } from '../../src/interfaces/Erc20Interface'
import { TestContractHandler } from '../TestContractHandler'
import { Nft, Datatoken } from '../../src/tokens'
import { NftFactory, NftCreateData } from '../../src/factories'
import {
  LoggerInstance,
  fetchData,
  postData,
  generateDid,
  getHash
} from '../../src/utils'
import { ProviderInstance } from '../../src/provider'
import { utils } from 'mocha'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Marketplace flow', () => {
  let contracts: TestContractHandler
  let nft: Nft
  let datatoken: Datatoken
  let nftFactory: NftFactory
  let owner: string
  let alice: string
  let bob: string
  let charlie: string
  let marketplaceFeeCollector: string
  let chainId: number
  let nftAddress: string
  let dtAddress: string
  let assetDid: string
  let encryptedFiles: string
  let encryptedDdo: string
  let asset

  it('Initialize Ocean v4 contracts', async () => {
    contracts = new TestContractHandler(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC20Template.abi as AbiItem[],
      PoolTemplate.abi as AbiItem[],
      ERC721Factory.abi as AbiItem[],
      Router.abi as AbiItem[],
      SideStaking.abi as AbiItem[],
      FixedRate.abi as AbiItem[],
      Dispenser.abi as AbiItem[],
      OPFCollector.abi as AbiItem[],

      ERC721Template.bytecode,
      ERC20Template.bytecode,
      PoolTemplate.bytecode,
      ERC721Factory.bytecode,
      Router.bytecode,
      SideStaking.bytecode,
      FixedRate.bytecode,
      Dispenser.bytecode,
      OPFCollector.bytecode
    )
    await contracts.getAccounts()
    owner = contracts.accounts[0]
    bob = contracts.accounts[1]
    alice = contracts.accounts[2]
    charlie = contracts.accounts[3]
    marketplaceFeeCollector = contracts.accounts[4]

    await contracts.deployContracts(owner, Router.abi as AbiItem[])
  })

  it('#Alice publishes an NFT and a Datatoken contract ', async () => {
    nftFactory = new NftFactory(contracts.factory721Address, web3)

    const nftData: NftCreateData = {
      name: 'AliceNFT',
      symbol: 'NFTA',
      templateIndex: 1,
      tokenURI: 'https://oceanprotocol.com/nft/'
    }

    const ercParams: Erc20CreateParams = {
      templateIndex: 1,
      minter: contracts.accounts[0],
      feeManager: alice,
      mpFeeAddress: marketplaceFeeCollector,
      feeToken: '0x0000000000000000000000000000000000000000',
      cap: '10000000000',
      feeAmount: '0',
      name: 'AliceDT',
      symbol: 'DTA'
    }

    const txReceipt = await nftFactory.createNftWithErc(
      contracts.accounts[0],
      nftData,
      ercParams
    )

    expect(txReceipt.events.NFTCreated.event === 'NFTCreated')
    expect(txReceipt.events.TokenCreated.event === 'TokenCreated')

    nftAddress = txReceipt.events.NFTCreated.returnValues.newTokenAddress
    assert(nftAddress != null)

    dtAddress = txReceipt.events.TokenCreated.returnValues.newTokenAddress
    assert(dtAddress != null)

    chainId = await web3.eth.getChainId()
    assetDid = generateDid(nftAddress, chainId)
    LoggerInstance.log('assetDid: ', assetDid)
  })

  it('Encrypt files', async () => {
    const files = [
      {
        type: 'url',
        url: 'https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-abstract.xml.gz-rss.xml',
        method: 'GET'
      }
    ]
    encryptedFiles = await ProviderInstance.encrypt(
      assetDid,
      alice,
      files,
      'http://127.0.0.1:8030',
      postData
    )
    LoggerInstance.log('encryptedFiles: ', encryptedFiles)
    assert(encryptedFiles != null)
  })

  it('Generates metadata', async () => {
    asset = {
      '@context': ['https://w3id.org/did/v1'],
      name: 'test-dataset',
      id: assetDid,
      version: '1.0.0',
      chainId: chainId,
      metadata: {
        created: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds,
        updated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds,
        name: 'test-dataset',
        type: 'dataset',
        description: 'Ocean protocol test dataset description',
        author: 'oceanprotocol-team',
        license: 'MIT',
        tags: ['white-papers'],
        additionalInformation: { 'test-key': 'test-value' },
        links: [
          'http://data.ceda.ac.uk/badc/ukcp09/data/gridded-land-obs/gridded-land-obs-daily/',
          'http://data.ceda.ac.uk/badc/ukcp09/data/gridded-land-obs/gridded-land-obs-averages-25km/',
          'http://data.ceda.ac.uk/badc/ukcp09/'
        ]
      },
      services: [
        {
          id: 'test',
          type: 'access',
          datatokenAddress: dtAddress,
          name: 'Download service',
          description: 'Download service',
          serviceEndpoint: 'http://localhost:8030/',
          timeout: 0,
          files: encryptedFiles
        }
      ]
    }
  })

  it('Encrypt DDO', async () => {
    encryptedDdo = await ProviderInstance.encrypt(
      assetDid,
      alice,
      asset,
      'http://127.0.0.1:8030',
      postData
    )
    LoggerInstance.log('encryptedDdo: ', encryptedDdo)
    assert(encryptedDdo != null)
  })

  it('set metadata on the nft', async () => {
    nft = new Nft(web3)
    await nft.addManager(nftAddress, owner, alice)
    await nft.addMetadataUpdater(nftAddress, owner, alice)
    const metaDataDecryptorUrl = 'http://127.0.0.1:8030'
    const metaDataDecryptorAddress = '0x123'
    const metaDataState = 1
    const data = web3.utils.asciiToHex(encryptedDdo)
    const dataHash = web3.utils.asciiToHex(getHash(encryptedDdo))
    const flags = web3.utils.asciiToHex(encryptedDdo)

    assert((await nft.getNftPermissions(nftAddress, alice)).updateMetadata === true)
    await nft.setMetadata(
      nftAddress,
      alice,
      metaDataState,
      metaDataDecryptorUrl,
      metaDataDecryptorAddress,
      flags,
      data,
      dataHash
    )

    // TODO: add getMetadata function from #1159 PR and following checks
    // const metadata = await nft.getMetadata(nftAddress)
    // assert(metadata[0] === metaDataDecryptorUrl)
    // assert(metadata[1] === metaDataDecryptorAddress)
  })

  it('Alice mints datatokens', async () => {
    datatoken = new Datatoken(web3)
    await datatoken.mint(dtAddress, owner, '1000', alice)
  })

  it('Alice allows marketplace to sell her datatokens', async () => {
    const approveTx = datatoken.approve(dtAddress, marketplaceFeeCollector, '20', alice)
    LoggerInstance.log('approveTx', approveTx)
  })

  it('Bob gets datatokens', async () => {
    const dTamount = '20'
    await datatoken.transfer(dtAddress, bob, dTamount, alice)
    const balance = await datatoken.balance(dtAddress, bob)
    assert(balance.toString() === dTamount.toString())
  })

  it('Bob consumes asset 1', async () => {
    const ordertx = datatoken.startOrder(
      dtAddress,
      owner,
      bob,
      '1',
      1,
      marketplaceFeeCollector,
      contracts.oceanAddress,
      '1'
    )
    assert(ordertx != null)

    // TODO: INMPLEMENT DOWNLOAD LOGIC
  })
})
