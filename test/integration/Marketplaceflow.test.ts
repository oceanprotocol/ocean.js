import { AbiItem } from 'web3-utils/types'
import { TestContractHandler } from '../TestContractHandler'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Ocean } from '../../src/ocean/Ocean'
import config from './config'
import { assert } from 'console'

import Web3 from 'web3'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
const web3 = new Web3('http://127.0.0.1:8545')

describe('Marketplace flow', () => {
  let owner
  let bob
  let ddo
  let alice
  let asset
  let marketplace
  let contracts
  let datatoken
  let tokenAddress
  let service1
  let price
  let ocean
  let accessService
  let data
  let blob

  const marketplaceAllowance = '20'
  const tokenAmount = '100'

  describe('#MarketplaceDownloadFlow-Test', () => {
    it('Initialize Ocean contracts v3', async () => {
      contracts = new TestContractHandler(
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        datatokensTemplate.bytecode,
        factory.bytecode,
        web3
      )

      ocean = await Ocean.getInstance(config)
      owner = (await ocean.accounts.list())[0]
      alice = (await ocean.accounts.list())[1]
      bob = (await ocean.accounts.list())[2]
      marketplace = (await ocean.accounts.list())[3]
      data = { t: 1, url: ocean.config.metadataStoreUri }
      blob = JSON.stringify(data)
      await contracts.deployContracts(owner.getId())
    })

    it('Alice publishes a datatoken contract', async () => {
      datatoken = new DataTokens(
        contracts.factoryAddress,
        factory.abi as AbiItem[],
        datatokensTemplate.abi as AbiItem[],
        web3
      )
      tokenAddress = await datatoken.create(blob, alice.getId())
      assert(tokenAddress != null)
    })

    it('Generates metadata', async () => {
      asset = {
        main: {
          type: 'dataset',
          name: 'test-dataset',
          dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds
          author: 'oceanprotocol-team',
          license: 'MIT',
          files: [
            {
              url:
                'https://raw.githubusercontent.com/tbertinmahieux/MSongsDB/master/Tasks_Demos/CoverSongs/shs_dataset_test.txt',
              checksum: 'efb2c764274b745f5fc37f97c6b0e761',
              contentLength: '4535431',
              contentType: 'text/csv',
              encoding: 'UTF-8',
              compression: 'zip'
            }
          ]
        }
      }
    })

    it('Alice publishes a dataset', async () => {
      price = datatoken.toWei('10') // in datatoken
      const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
      const timeout = 0
      service1 = await ocean.assets.createAccessServiceAttributes(
        alice,
        price,
        publishedDate,
        timeout
      )
      ddo = await ocean.assets.create(asset, alice, [service1], tokenAddress)
      assert(ddo.dataToken === tokenAddress)
    })

    it('Alice mints 100 tokens', async () => {
      await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
    })

    it('Alice allows marketplace to sell her datatokens', async () => {
      await datatoken
        .approve(tokenAddress, marketplace.getId(), marketplaceAllowance, alice.getId())
        .then(async () => {
          const allowance = await datatoken.allowance(
            tokenAddress,
            alice.getId(),
            marketplace.getId()
          )
          assert(allowance.toString() === marketplaceAllowance.toString())
        })
    })

    it('Marketplace withdraw Alice tokens from allowance', async () => {
      const allowance = await datatoken.allowance(
        tokenAddress,
        alice.getId(),
        marketplace.getId()
      )
      await datatoken
        .transferFrom(tokenAddress, alice.getId(), allowance, marketplace.getId())
        .then(async () => {
          const marketplaceBalance = await datatoken.balance(
            tokenAddress,
            marketplace.getId()
          )
          assert(marketplaceBalance.toString() === marketplaceAllowance.toString())
        })
    })
    it('Marketplace should resolve asset using DID', async () => {
      await ocean.assets.resolve(ddo.id).then((newDDO) => {
        assert(newDDO.id === ddo.id)
      })
    })

    it('Marketplace posts asset for sale', async () => {
      accessService = await ocean.assets.getServiceByType(ddo.id, 'access')
      price = 20
      assert(accessService.attributes.main.cost * price === datatoken.toWei('200'))
    })

    it('Bob gets datatokens', async () => {
      const dTamount = '20'
      await datatoken
        .transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
        .then(async () => {
          const balance = await datatoken.balance(tokenAddress, bob.getId())
          assert(balance.toString() === dTamount.toString())
        })
    })

    it('Bob consumes asset 1', async () => {
      await ocean.assets
        .order(ddo.id, accessService.type, bob.getId())
        .then(async (res: any) => {
          res = JSON.parse(res)
          return await datatoken.transferWei(
            res.dataToken,
            res.to,
            String(res.numTokens),
            res.from
          )
        })
        .then(async (tx) => {
          await ocean.assets.download(
            ddo.id,
            tx.transactionHash,
            tokenAddress,
            bob,
            './node_modules/my-datasets'
          )
        })
    })
    it('owner can list there assets', async () => {
      const assets = await ocean.assets.ownerAssets(alice.getId())
      assert(assets.length > 0)
    })
  })
})
