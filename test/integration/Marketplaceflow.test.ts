import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Account, EditableMetadata, Service, ServiceAccess, DID } from '../../src/lib'
import { noDidPrefixed, LoggerInstance } from '../../src/utils'
import { Ocean } from '../../src/ocean/Ocean'
import { ConfigHelper } from '../../src/utils/ConfigHelper'
import { TestContractHandler } from '../TestContractHandler'

const web3 = new Web3('http://127.0.0.1:8545')

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

use(spies)

describe('Marketplace flow', () => {
  let owner: Account
  let bob: Account
  let ddo
  let ddoWithBadUrl
  let alice: Account
  let asset
  let assetWithBadUrl
  let marketplace: Account
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  let tokenAddressForBadUrlAsset: string
  let service1: ServiceAccess
  let price: string
  let ocean: Ocean
  let accessService: Service
  let data
  let blob
  let wrongDdo

  const marketplaceAllowance = '20'
  const tokenAmount = '100'
  const aquaSleep = 50000

  it('Initialize Ocean contracts v3', async () => {
    contracts = new TestContractHandler(
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      datatokensTemplate.bytecode,
      factory.bytecode,
      web3
    )
    const config = new ConfigHelper().getConfig('development')
    config.web3Provider = web3
    ocean = await Ocean.getInstance(config)
    owner = (await ocean.accounts.list())[0]
    alice = (await ocean.accounts.list())[1]
    bob = (await ocean.accounts.list())[2]
    marketplace = (await ocean.accounts.list())[3]
    data = { t: 1, url: config.metadataCacheUri }
    blob = JSON.stringify(data)
    await contracts.deployContracts(owner.getId())
  })

  it('Alice publishes a datatoken contract', async () => {
    datatoken = new DataTokens(
      contracts.factoryAddress,
      factory.abi as AbiItem[],
      datatokensTemplate.abi as AbiItem[],
      web3,
      LoggerInstance
    )
    tokenAddress = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddress != null)
    tokenAddressForBadUrlAsset = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressForBadUrlAsset != null)
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
            url: 'https://s3.amazonaws.com/testfiles.oceanprotocol.com/info.0.json',
            checksum: 'efb2c764274b745f5fc37f97c6b0e761',
            contentLength: '4535431',
            contentType: 'text/csv',
            encoding: 'UTF-8',
            compression: 'zip',
            index: 0
          }
        ]
      }
    }
    assetWithBadUrl = {
      main: {
        type: 'dataset',
        name: 'test-dataset',
        dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds
        author: 'oceanprotocol-team',
        license: 'MIT',
        files: [
          {
            url: 'https://s3.amazonaws.com/testfiles.oceanprotocol.com/nosuchfile',
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

  it('Alice publishes both datasets', async () => {
    price = '10' // in datatoken
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
    await sleep(1000)
    ddoWithBadUrl = await ocean.assets.create(
      assetWithBadUrl,
      alice,
      [service1],
      tokenAddressForBadUrlAsset
    )
    assert(ddoWithBadUrl.dataToken === tokenAddressForBadUrlAsset)
    await sleep(aquaSleep)
  })

  it('Alice FAILS to publishes a dataset with INVALID metadata', async () => {
    price = '10' // in datatoken
    const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const timeout = 0
    service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      publishedDate,
      timeout
    )

    asset.main.files[0].index = null
    wrongDdo = await ocean.assets.create(asset, alice, [service1], tokenAddress)
    console.log(wrongDdo)
    assert(wrongDdo === null)
    await sleep(aquaSleep)
  })

  it('Alice mints 100 tokens', async () => {
    await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressForBadUrlAsset, alice.getId(), tokenAmount)
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
    price = '20'
    assert.equal(accessService.attributes.main.cost * Number(price), 200)
  })

  it('Bob gets datatokens', async () => {
    const dTamount = '20'
    await datatoken
      .transfer(tokenAddress, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddress, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
    await datatoken
      .transfer(tokenAddressForBadUrlAsset, bob.getId(), dTamount, alice.getId())
      .then(async () => {
        const balance = await datatoken.balance(tokenAddressForBadUrlAsset, bob.getId())
        assert(balance.toString() === dTamount.toString())
      })
  })

  it('Bob consumes asset 1', async () => {
    await ocean.assets.order(ddo.id, accessService.type, bob.getId()).then(async (tx) => {
      assert(tx != null)
      await ocean.assets.download(
        ddo.id,
        tx,
        tokenAddress,
        bob,
        './node_modules/my-datasets'
      )
    })
  })

  it('Bob consumes same asset again, without paying', async () => {
    const balanceBefore = await datatoken.balance(tokenAddress, bob.getId())
    await ocean.assets.order(ddo.id, accessService.type, bob.getId()).then(async (tx) => {
      assert(tx != null)
      await ocean.assets.download(
        ddo.id,
        tx,
        tokenAddress,
        bob,
        './node_modules/my-datasets'
      )
    })
    const balanceAfter = await datatoken.balance(tokenAddress, bob.getId())
    assert(balanceBefore === balanceAfter)
  })

  it('owner can list their assets', async () => {
    const assets = await ocean.assets.ownerAssets(alice.getId())
    assert(assets.results.length > 0)
  })

  it('Alice updates metadata and removes sample links', async () => {
    const newMetaData: EditableMetadata = {
      description: 'new description no links',
      title: 'new title no links'
    }
    const newDdo = await ocean.assets.editMetadata(ddo, newMetaData)
    assert(newDdo !== null)
    const txid = await ocean.onChainMetadata.update(newDdo.id, newDdo, alice.getId())
    assert(txid !== null)
    await sleep(60000)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'metadata')
    assert.deepEqual(metaData.attributes.additionalInformation.links, [])
  })

  it('Alice updates metadata', async () => {
    const newMetaData: EditableMetadata = {
      description: 'new description',
      title: 'new title',
      links: [{ name: 'link1', type: 'sample', url: 'http://example.net' }]
    }
    const oldDdo = await ocean.assets.resolve(ddo.id)
    const newDdo = await ocean.assets.editMetadata(oldDdo, newMetaData)
    assert(newDdo !== null)
    const txid = await ocean.onChainMetadata.update(newDdo.id, newDdo, alice.getId())
    assert(txid !== null)
    await sleep(aquaSleep)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'metadata')
    assert.equal(metaData.attributes.main.name, newMetaData.title)
    assert.equal(
      metaData.attributes.additionalInformation.description,
      newMetaData.description
    )
    assert.deepEqual(metaData.attributes.additionalInformation.links, newMetaData.links)
  })
  it('Alice fails to update INVALID metadata )', async () => {
    const newMetaData = {
      description: 'new description',
      title: 'new title',
      wrong: 'wrong field',
      links: [{ name: 'link1', type: 'sample', url: 'http://example.net' }]
    }
    const oldDdo = await ocean.assets.resolve(ddo.id)

    wrongDdo = await ocean.assets.editMetadata(oldDdo, newMetaData)

    wrongDdo.service = []

    assert(wrongDdo !== null)
    const txid = await ocean.assets.updateMetadata(wrongDdo, alice.getId())
    assert(txid === null)
    await sleep(aquaSleep)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'metadata')
    assert.equal(metaData.attributes.main.name, newMetaData.title)
    assert.equal(
      metaData.attributes.additionalInformation.description,
      newMetaData.description
    )
    assert.deepEqual(metaData.attributes.additionalInformation.links, newMetaData.links)
    assert.deepEqual(metaData.attributes.main.wrong, undefined)
    // const updatedDdo = await ocean.assets.resolve(ddo.id)
    // assert.deepEqual(newDdo,updatedDdo) the only different fields are 'datePublished' and 'updated', showing it works
  })

  it('Alice updates timeout for the access service', async () => {
    ddo = await ocean.assets.resolve(ddo.id)
    const service = ddo.findServiceByType('access')
    assert(service !== null)
    const serviceIndex = service.index
    const newTimeout = 123
    const newDdo = await ocean.assets.editServiceTimeout(ddo, serviceIndex, newTimeout)
    assert(newDdo !== null)
    const txid = await ocean.onChainMetadata.update(newDdo.id, newDdo, alice.getId())
    assert(txid !== null)
    await sleep(aquaSleep)
    const metaData = await ocean.assets.getServiceByType(ddo.id, 'access')
    assert(parseInt(metaData.attributes.main.timeout) === parseInt(newTimeout.toFixed()))
  })

  it('Alice should check if her asset has valid url(s)', async () => {
    const did: DID = DID.generate(noDidPrefixed(ddo.id))
    const response = await ocean.provider.fileinfo(did)
    assert(response[0].contentLength === '1161')
    assert(response[0].contentType === 'application/json')
  })

  it('Alice publishes a dataset but passed data token is invalid', async () => {
    price = '10' // in datatoken
    const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const timeout = 0
    service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      publishedDate,
      timeout
    )

    ddo = await ocean.assets.create(asset, alice, [service1], 'gibberishDataToken')
    assert.equal(ddo, null)
  })

  it('Alice publishes a dataset but created data token is invalid', async () => {
    price = '10' // in datatoken
    const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const timeout = 0
    service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      publishedDate,
      timeout
    )

    spy.on(ocean.datatokens, 'create', () => Promise.resolve(null))
    ddo = await ocean.assets.create(asset, alice, [service1])
    assert.equal(ddo, null)
  })

  it('Bob should get his order History', async () => {
    const history = await ocean.assets.getOrderHistory(bob)
    assert(history.length > 0)
  })

  it('Alice should not get any order History', async () => {
    const history = await ocean.assets.getOrderHistory(alice)
    assert(history.length === 0)
  })

  it('Generates invalid metadata', async () => {
    asset = {
      main: {
        type: 'dataset',
        dateCreated: new Date(Date.now()).toISOString().split('.')[0] + 'Z', // remove milliseconds
        author: 'oceanprotocol-team',
        license: 'MIT',
        files: [
          {
            url: 'https://s3.amazonaws.com/testfiles.oceanprotocol.com/info.0.json',
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

  it('Alice fails to publish a dataset with invalid metadata', async () => {
    price = '10' // in datatoken
    const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const timeout = 0
    service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      publishedDate,
      timeout
    )

    ddo = await ocean.assets.create(asset, alice, [service1], tokenAddress)
    assert(ddo === null)
    await sleep(aquaSleep)
  })

  it('Bob tries to consumes asset with bad URL, but tokens are not deducted', async () => {
    const balance = await datatoken.balance(tokenAddressForBadUrlAsset, bob.getId())
    const txid = await ocean.assets.order(
      ddoWithBadUrl.id,
      accessService.type,
      bob.getId()
    )
    assert(txid === null)
    const balanceAfterOrder = await datatoken.balance(
      tokenAddressForBadUrlAsset,
      bob.getId()
    )
    assert(balance.toString() === balanceAfterOrder.toString())
  })
})
