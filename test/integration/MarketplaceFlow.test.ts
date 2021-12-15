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
import { LoggerInstance } from '../../src/utils'
import { ProviderInstance } from '../../src/provider'

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
  let nftAddress: string
  let dtAddress: string
  let asset
  const marketplaceAllowance = '20'
  const tokenAmount = '10000'

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
  })

  it('encrypt files', async () => {
    const files = {}
  })

  it('Generates metadata', async () => {
    const chainId = 8996
    const did = sha256(`${nftAddress}${chainId}`)
    asset = {
      '@context': ['https://w3id.org/did/v1'],
      name: 'test-dataset',
      id: did,
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
          files:
            '0x04f0dddf93c186c38bfea243e06889b490a491141585669cfbe7521a5c7acb3bfea5a5527f17eb75ae1f66501e1f70f73df757490c8df479a618b0dd23b2bf3c62d07c372f64c6ad94209947471a898c71f1b2f0ab2a965024fa8e454644661d538b6aa025e517197ac87a3767820f018358999afda760225053df20ff14f499fcf4e7e036beb843ad95587c138e1f972e370d4c68c99ab2602b988c837f6f76658a23e99da369f6898ce1426d49c199cf8ffa33b79002765325c12781a2202239381866c6a06b07754024ee9a6e4aabc8'
        }
      ]
    }
  })
})
