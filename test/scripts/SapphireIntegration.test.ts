import * as sapphire from '@oasisprotocol/sapphire-paratime'
import addresses from '@oceanprotocol/contracts/addresses/address.json'
import { ethers } from 'ethers'
import { AccesslistFactory } from '../../src/contracts/AccessListFactory'
import { AccessListContract } from '../../src/contracts/AccessList'
import { NftFactory } from '../../src/contracts/NFTFactory'
import { ZERO_ADDRESS } from '../../src/utils/Constants'
import { assert } from 'console'
import { AccessListData, Nft, NftCreateData } from '../../src'

describe('Sapphire tests', async () => {
  const provider = sapphire.wrap(
    ethers.getDefaultProvider(sapphire.NETWORKS.testnet.defaultGateway)
  )
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const walletWrapped = sapphire.wrap(
    new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  )

  const addrs: any = addresses.oasis_saphire_testnet
  const listData: AccessListData = {
    name: 'ListName',
    symbol: 'ListSymbol',
    tokenURI: ['https://oceanprotocol.com/nft/'],
    transferable: true,
    owner: await wallet.getAddress(),
    user: [await wallet.getAddress(), ZERO_ADDRESS]
  }
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

  const filesObject: any = [
    {
      url: 'https://raw.githubusercontent.com/oceanprotocol/test-algorithm/master/javascript/algo.js',
      contentType: 'text/js',
      encoding: 'UTF-8'
    }
  ]

  it('Create Access List factory', () => {
    factoryContract = new AccesslistFactory(addrs.AccessListFactory, wallet, 23295)
    assert(factoryContract !== null, 'factory not created')
  })

  it('Create Access List contract', async () => {
    listData.owner = await wallet.getAddress()
    listAddress = await factoryContract.deployAccessListContract(listData)
    assert(listAddress !== null)
    console.log('list address: ', listAddress)
    accessListToken = new AccessListContract(wallet, 23295)
  })
  it('Create ERC721 factory', () => {
    nftFactory = new NftFactory(addrs.ERC721Factory, wallet, 23295)
    assert(factoryContract !== null, 'factory not created')
  })

  it('Create ERC721 contract', async () => {
    nftData.owner = await wallet.getAddress()
    nftAddress = await (nftFactory as NftFactory).createNFT(nftData)
    console.log('nftAddress: ', nftAddress)
    nftToken = new Nft(wallet, 23295)
  })
  it('Create Datatoken4 contract', async () => {
    datatokenAddress = await (nftToken as Nft).createDatatoken(
      nftAddress,
      await walletWrapped.getAddress(),
      await walletWrapped.getAddress(),
      await walletWrapped.getAddress(),
      await walletWrapped.getAddress(),
      ZERO_ADDRESS,
      '0',
      '10000',
      'ERC20T4',
      'ERC20DT1Symbol',
      4,
      JSON.stringify(filesObject)
    )
    assert(datatokenAddress, 'datatoken not created.')
  })
})
