import datatokensTemplate from '@oceanprotocol/contracts/artifacts/DataTokenTemplate.json'
import factory from '@oceanprotocol/contracts/artifacts/DTFactory.json'
import { assert, spy, use } from 'chai'
import spies from 'chai-spies'
import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import { DataTokens } from '../../src/datatokens/Datatokens'
import { Account, EditableMetadata, Service, ServiceAccess, DID } from '../../src/lib'
import { noDidPrefixed } from '../../src/utils/'
import { Ocean } from '../../src/ocean/Ocean'
import { ConfigHelper } from '../../src/utils/ConfigHelper'
import { TestContractHandler } from '../TestContractHandler'
import { LoggerInstance } from '../../src/utils'
const fetch = require('cross-fetch')
const web3 = new Web3('http://127.0.0.1:8545')

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
async function waitForAqua(ocean, did) {
  const apiPath = '/api/v1/aquarius/assets/ddo'
  let tries = 0
  do {
    try {
      const result = await fetch(ocean.metadataCache.url + apiPath + '/' + did)
      if (result.ok) {
        break
      }
    } catch (e) {
      // do nothing
    }
    await sleep(1500)
    tries++
  } while (tries < 100)
}
use(spies)

describe('Marketplace flow', () => {
  let owner: Account
  let bob: Account
  let ddo
  let ddoWithPool
  let ddoWithBadUrl
  let ddoEncrypted
  let alice: Account
  let asset
  let assetWithPool
  let assetWithBadUrl
  let assetWithEncrypt
  let marketplace: Account
  let contracts: TestContractHandler
  let datatoken: DataTokens
  let tokenAddress: string
  let tokenAddressWithPool: string
  let tokenAddressForBadUrlAsset: string
  let tokenAddressEncrypted: string
  let service1: ServiceAccess
  let price: string
  let ocean: Ocean
  let accessService: Service
  let data
  let blob
  let poolLastPrice

  const marketplaceAllowance = '20'
  const tokenAmount = '10000'
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
    tokenAddressWithPool = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressWithPool != null)
    tokenAddressForBadUrlAsset = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
    assert(tokenAddressForBadUrlAsset != null)
    tokenAddressEncrypted = await datatoken.create(
      blob,
      alice.getId(),
      '10000000000',
      'AliceDT',
      'DTA'
    )
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
            compression: 'zip'
          }
        ]
      }
    }
    assetWithPool = {
      main: {
        type: 'dataset',
        name: 'test-dataset-with-pools',
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
    assetWithEncrypt = {
      main: {
        type: 'dataset encrypted',
        name: 'test-dataset-encrypted',
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
    assetWithBadUrl = {
      main: {
        type: 'datasetWithBadUrl',
        name: 'test-dataset-withBadUrl',
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

  it('Alice publishes all datasets', async () => {
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
    const storeTx = await ocean.onChainMetadata.publish(ddo.id, ddo, alice.getId())
    assert(storeTx)
    await waitForAqua(ocean, ddo.id)
    ddoWithBadUrl = await ocean.assets.create(
      assetWithBadUrl,
      alice,
      [service1],
      tokenAddressForBadUrlAsset
    )
    assert(ddoWithBadUrl.dataToken === tokenAddressForBadUrlAsset)
    const storeTxWithBadUrl = await ocean.onChainMetadata.publish(
      ddoWithBadUrl.id,
      ddoWithBadUrl,
      alice.getId()
    )
    assert(storeTxWithBadUrl)
    await waitForAqua(ocean, ddoWithBadUrl.id)
    ddoWithPool = await ocean.assets.create(
      assetWithPool,
      alice,
      [service1],
      tokenAddressWithPool
    )
    assert(ddoWithPool.dataToken === tokenAddressWithPool)
    const storeTxWithPool = await ocean.onChainMetadata.publish(
      ddoWithPool.id,
      ddoWithPool,
      alice.getId()
    )
    assert(storeTxWithPool)
    await waitForAqua(ocean, ddoWithPool.id)
  })

  it('Alice publishes an encrypted dataset', async () => {
    ddoEncrypted = await ocean.assets.create(
      assetWithEncrypt,
      alice,
      [service1],
      tokenAddressEncrypted
    )
    assert(ddoEncrypted.dataToken === tokenAddressEncrypted)
    const storeTx = await ocean.onChainMetadata.publish(
      ddoEncrypted.id,
      ddoEncrypted,
      alice.getId(),
      true
    )
    assert(storeTx)
    await waitForAqua(ocean, ddoEncrypted.id)
  })
  it('Marketplace should resolve asset using DID', async () => {
    await ocean.assets.resolve(ddo.id).then((newDDO) => {
      assert(newDDO.id === ddo.id)
    })
  })
  it('Marketplace should resolve asset with bad URL using DID', async () => {
    await ocean.assets.resolve(ddoWithBadUrl.id).then((newDDO) => {
      assert(newDDO.id === ddoWithBadUrl.id)
    })
  })
  it('Marketplace should resolve the encrypted asset using DID', async () => {
    await ocean.assets.resolve(ddoEncrypted.id).then((newDDO) => {
      assert(newDDO.id === ddoEncrypted.id)
    })
  })
  it('Alice mints 100 tokens', async () => {
    await datatoken.mint(tokenAddress, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressForBadUrlAsset, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressEncrypted, alice.getId(), tokenAmount)
    await datatoken.mint(tokenAddressWithPool, alice.getId(), tokenAmount)
    // since we are in barge, we can do this
    await datatoken.mint(ocean.pool.oceanAddress, owner.getId(), tokenAmount)
    await datatoken.transfer(ocean.pool.oceanAddress, alice.getId(), '200', owner.getId())
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
  /*
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

  it('Alice updates metadata and removes sample links with encrypted ddo', async () => {
    const newMetaData: EditableMetadata = {
      description: 'new description no links',
      title: 'new title no links'
    }
    const newDdo = await ocean.assets.editMetadata(ddoEncrypted, newMetaData)
    assert(newDdo !== null)
    const txid = await ocean.onChainMetadata.update(
      newDdo.id,
      newDdo,
      alice.getId(),
      true
    )
    assert(txid !== null)
    await sleep(60000)
    const metaData = await ocean.assets.getServiceByType(ddoEncrypted.id, 'metadata')
    assert.deepEqual(metaData.attributes.additionalInformation.links, [])
  })

  it('Alice updates metadata', async () => {
    const newMetaData: EditableMetadata = {
      description: 'new description',
      title: 'new title',
      links: [{ name: 'link1', type: 'sample', url: 'http://example.net' }]
    }
    const newDdo = await ocean.assets.editMetadata(ddo, newMetaData)
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

  it('Alice updates timeout for the access service', async () => {
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
  */
  it('Alice should create a FRE pricing for her asset', async () => {
    const trxReceipt = await ocean.fixedRateExchange.create(
      tokenAddress,
      '1',
      alice.getId()
    )
    assert(trxReceipt)
    console.error(trxReceipt)
    await sleep(aquaSleep)
    const exchangeDetails = await ocean.fixedRateExchange.searchforDT(tokenAddress, '0')
    const resolvedDDO = await ocean.assets.resolve(ddo.id)
    assert(resolvedDDO.price.type === 'exchange')
    assert(resolvedDDO.price.value === 1)
    assert(resolvedDDO.price.exchange_id === exchangeDetails[0].exchangeID)
  })
  it('Alice should update the FRE pricing for her asset', async () => {
    const exchangeDetails = await ocean.fixedRateExchange.searchforDT(tokenAddress, '0')
    assert(exchangeDetails)
    const trxReceipt = await ocean.fixedRateExchange.setRate(
      exchangeDetails[0].exchangeID,
      2,
      alice.getId()
    )
    assert(trxReceipt)
    await sleep(aquaSleep)
    const resolvedDDO = await ocean.assets.resolve(ddo.id)
    assert(resolvedDDO.price.type === 'exchange')
    assert(resolvedDDO.price.value === 2)
  })
  it('Alice should create a Pool pricing for her asset', async () => {
    const dtAmount = '45'
    const dtWeight = '9'
    const oceanAmount =
      (parseFloat(dtAmount) * (10 - parseFloat(dtWeight))) / parseFloat(dtWeight)
    const fee = '0.02'
    const createTx = await ocean.pool.create(
      alice.getId(),
      tokenAddressWithPool,
      dtAmount,
      dtWeight,
      String(oceanAmount),
      fee
    )
    assert(createTx)
    const alicePoolAddress = createTx.events.BPoolRegistered.returnValues[0]
    assert(alicePoolAddress)
    await sleep(aquaSleep)
    const resolvedDDO = await ocean.assets.resolve(ddoWithPool.id)
    poolLastPrice = resolvedDDO.price.value
    assert(resolvedDDO.price.type === 'pool')
    assert(resolvedDDO.price.value)
    assert(resolvedDDO.price.pools.includes(alicePoolAddress))
  })
  it('Alice should update the POOL pricing for her asset by buying a DT', async () => {
    const poolAddress=await ocean.pool.searchPoolforDT(tokenAddressWithPool)
    const buyTx = await ocean.pool.buyDT(alice.getId(), poolAddress[0], '1', '999')
    assert(buyTx)
    await sleep(aquaSleep)
    const resolvedDDO = await ocean.assets.resolve(ddoWithPool.id)
    assert(resolvedDDO.price.type === 'pool')
    assert(resolvedDDO.price.value !== poolLastPrice)
    assert(resolvedDDO.price.pools.includes(poolAddress[0]))
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
