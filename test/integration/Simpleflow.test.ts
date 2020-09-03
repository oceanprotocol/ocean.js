import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { AbiItem } from 'web3-utils/types'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
const web3 = new Web3('http://127.0.0.1:8545')

describe('Simple flow', () => {
  let owner
  let bob
  let alice
  let contracts
  let datatoken
  let tokenAddress
  let transactionId
  const tokenAmount = '100'
  const transferAmount = '1'
  const blob = 'http://localhost:8030/api/v1/services/consume'
  describe('#test', () => {
    it('Initialize Ocean contracts v3', async () => {
      contracts = new TestContractHandler(
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        datatokensTemplate.bytecode,
        factory.bytecode,
        web3
      )
      await contracts.getAccounts()
      owner = contracts.accounts[0]
      alice = contracts.accounts[1]
      bob = contracts.accounts[2]
      await contracts.deployContracts(owner)
    })
    it('Alice publishes a dataset', async () => {
      // Alice creates a Datatoken
      datatoken = new DataTokens(
        contracts.factoryAddress,
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        web3
      )
      tokenAddress = await datatoken.create(blob, alice, '10000000000', 'AliceDT', 'DTA')
    })
    it('Alice mints 100 tokens', async () => {
      await datatoken.mint(tokenAddress, alice, tokenAmount)
    })
    it('Alice transfers 1 token to Bob', async () => {
      const ts = await datatoken.transfer(tokenAddress, bob, transferAmount, alice)
      transactionId = ts.transactionHash
    })
    // it('Bob consumes dataset', async () => {
    //     const config = new Config()
    //     const ocean = await Ocean.getInstance(config)
    //     await ocean.assets.simpleDownload(tokenAddress, blob, transactionId, bob)
    // })
  })
})
