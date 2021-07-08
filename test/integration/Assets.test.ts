import { assert } from 'chai'

import { Ocean } from '../../src/ocean/Ocean'
import Web3 from 'web3'
import { Account, DDO, CredentialType, ConfigHelper, Metadata } from '../../src/lib'

const web3 = new Web3('http://127.0.0.1:8545')

describe('Assets', () => {
  let ocean: Ocean
  let alice: Account
  let bob: Account
  let charlie: Account
  let ddo: DDO
  let ddoWithAddressAnd3Box: DDO
  const addressType = CredentialType.address
  const threeBoxType = CredentialType.credential3Box
  let walletA: string
  let walletB: string
  let walletC: string
  const threeBoxValue = 'did:3:bafyre'

  beforeEach(async () => {
    const config = new ConfigHelper().getConfig('development')
    config.web3Provider = web3
    ocean = await Ocean.getInstance(config)
    alice = (await ocean.accounts.list())[1]
    walletA = alice.getId()
    bob = (await ocean.accounts.list())[2]
    walletB = bob.getId()
    charlie = (await ocean.accounts.list())[3]
    walletC = charlie.getId()
  })

  it('Alice creates a DDO', async () => {
    const metadata: Metadata = {
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

    const price = '10' // in datatoken
    const publishedDate = new Date(Date.now()).toISOString().split('.')[0] + 'Z'
    const timeout = 0
    const service1 = await ocean.assets.createAccessServiceAttributes(
      alice,
      price,
      publishedDate,
      timeout
    )

    ddo = await ocean.assets.create(metadata, alice, [service1])
    assert.isDefined(ddo)
    assert.isDefined(ddo.id)

    // const storeTx = await ocean.onChainMetadata.publish(ddo.id, ddo, alice.getId())
    // assert(storeTx)
    // await waitForAqua(ocean, ddo.id)
  })

  it('should add allow credential', async () => {
    assert(ocean.assets.checkCredential(ddo, addressType, walletA).status === 0)
    assert(ocean.assets.checkCredential(ddo, addressType, walletC).status === 0)
    const allowWalletAddressList = [walletA, walletB]
    console.error(JSON.stringify(ddo.credentials))
    const newDdo = await ocean.assets.updateCredentials(
      ddo,
      addressType,
      allowWalletAddressList,
      []
    )
    assert(newDdo.credentials.allow.length === 1)
    assert(ocean.assets.checkCredential(ddo, addressType, walletA).status === 0)
    assert(ocean.assets.checkCredential(ddo, addressType, walletC).status === 2)
  })

  it('should append allow credential', async () => {
    const allowWalletAddressList = [walletA, walletB]
    const allow3BoxList = [threeBoxValue]
    ddoWithAddressAnd3Box = await ocean.assets.updateCredentials(
      ddo,
      addressType,
      allowWalletAddressList,
      []
    )
    ddoWithAddressAnd3Box = await ocean.assets.updateCredentials(
      ddo,
      threeBoxType,
      allow3BoxList,
      []
    )
    assert(ddoWithAddressAnd3Box.credentials.allow.length === 2)
  })

  it('should add deny credential', async () => {
    const denyWalletAddressList = [walletC]
    const newDdo = await ocean.assets.updateCredentials(
      ddo,
      addressType,
      [],
      denyWalletAddressList
    )
    assert(newDdo.credentials.deny.length === 1)
    assert(ocean.assets.checkCredential(ddo, addressType, walletA).status === 0)
    assert(ocean.assets.checkCredential(ddo, addressType, walletC).status === 3)
  })

  it('should append deny credential', async () => {
    const denyWalletAddressList = [walletC]
    const deny3BoxList = [threeBoxValue]
    let newDdo = await ocean.assets.updateCredentials(
      ddo,
      addressType,
      [],
      denyWalletAddressList
    )
    newDdo = await ocean.assets.updateCredentials(ddo, threeBoxType, [], deny3BoxList)
    assert(newDdo.credentials.deny.length === 2)
  })

  it('should only remove allow credential by credential type', async () => {
    const allowWalletAddressList = [walletA, walletB]
    const allow3BoxList = [threeBoxValue]
    let newDdo = await ocean.assets.updateCredentials(
      ddo,
      addressType,
      allowWalletAddressList,
      []
    )
    newDdo = await ocean.assets.updateCredentials(
      ddoWithAddressAnd3Box,
      threeBoxType,
      allow3BoxList,
      []
    )
    assert(newDdo.credentials.allow.length === 2)
    newDdo = await ocean.assets.updateCredentials(
      ddoWithAddressAnd3Box,
      threeBoxType,
      [],
      []
    )
    assert(newDdo.credentials.allow.length === 1)
    assert(ocean.assets.checkCredential(ddo, addressType, walletA).status === 0)
    assert(ocean.assets.checkCredential(ddo, addressType, walletC).status === 2)
  })
})
