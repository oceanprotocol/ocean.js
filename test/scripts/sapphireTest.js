import * as sapphire from '@oasisprotocol/sapphire-paratime'
import addresses from '@oceanprotocol/contracts/addresses/address.json'
import { ethers, Signer } from 'ethers'
import { AccesslistFactory } from '../../src/contracts/AccessListFactory.ts'
import { AccessListContract } from '../../src/contracts/AccessList.ts'
import { ZERO_ADDRESS } from '../../src/utils/Constants.ts'
import { assert } from 'console'

const provider = sapphire.wrap(
  ethers.getDefaultProvider(sapphire.NETWORKS.testnet.defaultGateway)
)
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

const addrs = addresses.oasis_saphire_testnet
console.log(`addrs: ${JSON.stringify(addrs)}`)
const listData = {
  name: 'ListName',
  symbol: 'ListSymbol',
  tokenURI: ['https://oceanprotocol.com/nft/'],
  transferable: true,
  owner: await wallet.getAddress(),
  user: [await wallet.getAddress(), ZERO_ADDRESS]
}

const factoryContract = new AccesslistFactory(
  addrs.AccessListFactory,
  wallet,
  addrs.chainId
)
assert(factoryContract !== null, 'factory not created')

listData.owner = await wallet.getAddress()
const listAddress = await factoryContract.deployAccessListContract(listData)
assert(listAddress !== null)
console.log('list address: ', listAddress)
const accessListToken = new AccessListContract(wallet, 23295)

// describe('Sapphire tests', async () => {
//   const provider = sapphire.wrap(
//     ethers.getDefaultProvider(sapphire.NETWORKS.testnet.defaultGateway)
//   )
//   const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider)

//   const addresses = await getAddressesForSapphire(true)
//   const listData = {
//     name: 'ListName',
//     symbol: 'ListSymbol',
//     tokenURI: ['https://oceanprotocol.com/nft/'],
//     transferable: true,
//     owner: await wallet.getAddress(),
//     user: [await wallet.getAddress(), ZERO_ADDRESS]
//   }
//   let factoryContract
//   let listAddress
//   let accessListToken

//   it('Create Access List factory', () => {
//     factoryContract = new AccesslistFactory(addresses.AccessListFactory, wallet, 23295)
//     assert(factoryContract !== null, 'factory not created')
//   })

//   it('Create Access List contract', async () => {
//     listData.owner = await wallet.getAddress()
//     listAddress = await factoryContract.deployAccessListContract(listData)
//     assert(listAddress !== null)
//     console.log('list address: ', listAddress)
//     accessListToken = new AccessListContract(wallet, 23295)
//   })
// })
