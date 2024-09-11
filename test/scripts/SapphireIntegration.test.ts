import * as sapphire from '@oasisprotocol/sapphire-paratime'
import addresses from '@oceanprotocol/contracts/addresses/address.json'
import { ethers } from 'ethers'
import { AccesslistFactory } from '../../src/contracts/AccessListFactory'
import { AccessListContract } from '../../src/contracts/AccessList'
import { NftFactory } from '../../src/contracts/NFTFactory'
import { ZERO_ADDRESS } from '../../src/utils/Constants'
import { assert } from 'console'
import { Datatoken4 } from '../../src/contracts/Datatoken4'
import { AbiItem, Config, Nft, NftCreateData } from '../../src'
import ERC20Template4 from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template4.sol/ERC20Template4.json'

describe('Sapphire tests', async () => {
  const provider = sapphire.wrap(
    ethers.getDefaultProvider(sapphire.NETWORKS.testnet.defaultGateway)
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const walletWrapped = sapphire.wrap(
    new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  )

  const addrs: any = addresses.oasis_saphire_testnet
  const nftData: NftCreateData = {
    name: 'NFTName',
    symbol: 'NFTSymbol',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: null
  }

  let factoryContract: any
  let listAddress: string
  let accessListToken: any

  let nftFactory: any
  let nftAddress: string
  let nftToken: any

  let datatokenAddress: string
  let datatoken: any

  const filesObject: any = [
    {
      url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
      contentType: 'text/js',
      encoding: 'UTF-8'
    }
  ]

  const config: Config = {
    chainId: 23295,
    network: 'oasis_saphire_testnet',
    nodeUri: 'https://testnet.sapphire.oasis.dev',
    subgraphUri:
      'https://v4.subgraph.sapphire-testnet.oceanprotocol.com/subgraphs/name/oceanprotocol/ocean-subgraph',
    explorerUri: 'https://explorer.oasis.io/testnet/sapphire/',
    gasFeeMultiplier: 1,
    oceanTokenSymbol: 'OCEAN',
    transactionPollingTimeout: 2,
    transactionBlockTimeout: 3,
    transactionConfirmationBlocks: 1,
    web3Provider: provider
  }

  it('Create Access List factory', () => {
    factoryContract = new AccesslistFactory(addrs.AccessListFactory, wallet, 23295)
    assert(factoryContract !== null, 'factory not created')
  })

  it('Create Access List contract', async () => {
    listAddress = await (factoryContract as AccesslistFactory).deployAccessListContract(
      'AllowList',
      'ALLOW',
      ['https://oceanprotocol.com/nft/'],
      false,
      await wallet.getAddress(),
      [await wallet.getAddress(), ZERO_ADDRESS]
    )
    assert(listAddress !== null)
    accessListToken = new AccessListContract(wallet, 23295)
    assert(
      (await (factoryContract as AccesslistFactory).isDeployed(listAddress)) === true,
      'access list not deployed'
    )
  })
  it('Create ERC721 factory', () => {
    nftFactory = new NftFactory(addrs.ERC721Factory, wallet, 23295)
    assert(factoryContract !== null, 'factory not created')
  })

  it('Create ERC721 contract', async () => {
    nftData.owner = await wallet.getAddress()
    nftAddress = await (nftFactory as NftFactory).createNFT(nftData)
    nftToken = new Nft(wallet, 23295)
  })
  it('Create Datatoken4 contract', async () => {
    datatokenAddress = await (nftToken as Nft).createDatatoken(
      nftAddress,
      await wallet.getAddress(),
      await wallet.getAddress(),
      await wallet.getAddress(),
      await wallet.getAddress(),
      ZERO_ADDRESS,
      '0',
      '100000',
      'ERC20T4',
      'ERC20DT1Symbol',
      1,
      JSON.stringify(filesObject),
      addrs.AccessListFactory,
      listAddress
    )
    assert(datatokenAddress, 'datatoken not created.')
  })
  it('Get Allow Access List', async () => {
    const address = await wallet.getAddress()
    datatoken = new Datatoken4(
      walletWrapped,
      ethers.utils.toUtf8Bytes(JSON.stringify(filesObject)),
      23295,
      config,
      ERC20Template4.abi as AbiItem[]
    )
    assert(
      (await (datatoken as Datatoken4).isDatatokenDeployer(datatokenAddress, address)) ===
        true,
      'no ERC20 deployer'
    )
    assert(
      (await (nftToken as Nft).isDatatokenDeployed(nftAddress, datatokenAddress)) ===
        true,
      'datatoken not deployed'
    )
    assert(
      (await (datatoken as Datatoken4).getAllowlistContract(datatokenAddress)) ===
        listAddress,
      'no access list attached to datatoken.'
    )
  })
  it('Get Deny Access List', async () => {
    assert(
      (await (datatoken as Datatoken4).getDenylistContract(datatokenAddress)) ===
        ZERO_ADDRESS,
      'no access list attached to datatoken.'
    )
  })
})
