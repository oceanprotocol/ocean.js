import { assert } from 'chai'
import sha256 from 'crypto-js/sha256'
import { ethers, Signer } from 'ethers'
import { getAddresses, provider } from '../config'
import { NftFactory, NftCreateData, Nft, ZERO_ADDRESS, getEventFromTx } from '../../src'
import { MetadataAndTokenURI } from '../../src/@types'

describe('NFT', () => {
  let nftOwner: Signer
  let user1: Signer
  let user2: Signer
  let user3: Signer
  let addresses: any
  let nftDatatoken: Nft
  let nftFactory: NftFactory
  let nftAddress: string

  const nftData: NftCreateData = {
    name: 'NFTName',
    symbol: 'NFTSymbol',
    templateIndex: 1,
    tokenURI: 'https://oceanprotocol.com/nft/',
    transferable: true,
    owner: null
  }

  before(async () => {
    nftOwner = (await provider.getSigner(0)) as Signer
    user1 = (await provider.getSigner(1)) as Signer
    user2 = (await provider.getSigner(2)) as Signer
    user3 = (await provider.getSigner(3)) as Signer
    addresses = await getAddresses()

    nftData.owner = await nftOwner.getAddress()
  })

  it('should initialize NFTFactory instance and create a new NFT', async () => {
    nftFactory = new NftFactory(addresses.ERC721Factory, nftOwner, 8996)

    nftAddress = await nftFactory.createNFT(nftData)

    nftDatatoken = new Nft(nftOwner, 8996)
  })

  it('#getTokenURI', async () => {
    const tokenURI = await nftDatatoken.getTokenURI(nftAddress, 1)
    assert(tokenURI === nftData.tokenURI)
  })

  it('#createDatatoken - should create a new ERC20 Datatoken from NFT contract', async () => {
    const dtAddress = await nftDatatoken.createDatatoken(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress(),
      await user1.getAddress(),
      await user2.getAddress(),
      ZERO_ADDRESS,
      '0',
      '10000',
      nftData.name,
      nftData.symbol,
      1
    )
    assert(dtAddress)
  })

  it('#createDatatoken - should fail to create a new ERC20 Datatoken if not DatatokenDeployer', async () => {
    try {
      await nftDatatoken.createDatatoken(
        nftAddress,
        await user1.getAddress(),
        await nftOwner.getAddress(),
        await user1.getAddress(),
        await user2.getAddress(),
        ZERO_ADDRESS,
        '0',
        '10000',
        nftData.name,
        nftData.symbol,
        1
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not DatatokenDeployer')
    }
  })

  // Manager
  it('#addManager - should add a new Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .manager === false
    )

    await nftDatatoken.addManager(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .manager === true
    )
  })

  it('#addManager - should fail to add a new Manager, if NOT NFT Owner', async () => {
    try {
      await nftDatatoken.addManager(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not NFT Owner')
    }
  })

  it('#removeManager - should remove a Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .manager === true
    )

    await nftDatatoken.removeManager(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .manager === false
    )
  })

  it('#removeManager - should fail to remove a new Manager, if NOT NFT Owner', async () => {
    try {
      await nftDatatoken.removeManager(
        nftAddress,
        await user1.getAddress(),
        await nftOwner.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not NFT Owner')
    }
  })

  // DatatokenDeployer
  it('#addDatatokenDeployer -should add DatatokenDeployer if Manager', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        false
    )

    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )
  })

  it('#addDatatokenDeployer - should fail to add DatatokenDeployer if NOT Manager', async () => {
    try {
      await nftDatatoken.addDatatokenDeployer(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager')
    }
  })

  it('#removeDatatokenDeployer - remove DatatokenDeployer if Manager', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )

    await nftDatatoken.removeDatatokenDeployer(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        false
    )
  })

  it('#removeDatatokenDeployer - should fail and remove DatatokenDeployer if NOT Manager nor himself an DatatokenDeployer', async () => {
    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )
    try {
      await nftDatatoken.removeDatatokenDeployer(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager nor DatatokenDeployer')
    }
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )
  })

  it('#removeDatatokenDeployer - should fail to remove himself as an DatatokenDeployer', async () => {
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )
    try {
      await nftDatatoken.removeDatatokenDeployer(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager nor DatatokenDeployer')
    }
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )
  })

  //  MetadataUpdate
  it('#addMetadataUpdate - should add to remove Metadata Updater if Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .updateMetadata === false
    )

    await nftDatatoken.addMetadataUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .updateMetadata === true
    )
  })

  it('#addMetadataUpdate - should fail to add Metadata Updater if NOT Manager', async () => {
    try {
      await nftDatatoken.addMetadataUpdater(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager')
    }
  })

  it('#removeMetadataUpdate - remove Metadata Updater if Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .updateMetadata === true
    )

    await nftDatatoken.removeMetadataUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .updateMetadata === false
    )
  })

  it('#removeMetadataUpdate - should fail to remove Metadata Updater if NOT Manager', async () => {
    try {
      await nftDatatoken.removeMetadataUpdater(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager nor Metadata Updater')
    }
  })

  // StoreUpdater
  it('#addStoreUpdater - should add to remove Store Updater if Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .store === false
    )

    await nftDatatoken.addStoreUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .store === true
    )
  })

  it('#addStoreUpdater - should fail to add Store Updater if NOT Manager', async () => {
    try {
      await nftDatatoken.addStoreUpdater(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Manager')
    }
  })

  it('#removeStoreUpdater - remove Metadata Updater if Manager', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .store === true
    )

    await nftDatatoken.removeStoreUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .store === false
    )
  })

  it('#removeStoreUpdater - should fail to remove Metadata Updater if NOT Manager', async () => {
    try {
      await nftDatatoken.removeStoreUpdater(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress()
      )
      assert(false)
    } catch (e) {
      assert(e.message === `Caller is not Manager nor storeUpdater`)
    }
  })

  // Transfer test
  it('#transferNFT - should fail to transfer the NFT and clean all permissions, if NOT NFT Owner', async () => {
    assert((await nftDatatoken.getNftOwner(nftAddress)) !== (await user1.getAddress()))

    try {
      await nftDatatoken.transferNft(
        nftAddress,
        await user1.getAddress(),
        await user1.getAddress(),
        1
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not NFT Owner')
    }
  })

  it('#transferNFT - should transfer the NFT and clean all permissions, set new owner as manager', async () => {
    await nftDatatoken.addManager(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )
    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await user1.getAddress(),
      await user1.getAddress()
    )
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )

    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await nftOwner.getAddress()))

    await nftDatatoken.transferNft(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress(),
      1
    )
    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await user1.getAddress()))
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user1.getAddress())) ===
        true
    )

    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === false
    )
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user2.getAddress())) ===
        false
    )
  })

  // Safe transfer test
  it('#safeTransferNft - should fail to transfer the NFT and clean all permissions, if NOT NFT Owner', async () => {
    nftDatatoken = new Nft(user1, 8996)
    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await user1.getAddress()))

    try {
      await nftDatatoken.safeTransferNft(
        nftAddress,
        await nftOwner.getAddress(),
        await user1.getAddress(),
        1
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not NFT Owner')
    }
  })

  it('#safeTransferNft - should transfer the NFT and clean all permissions, set new owner as manager', async () => {
    await nftDatatoken.addManager(
      nftAddress,
      await user1.getAddress(),
      await user2.getAddress()
    )

    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await user1.getAddress(),
      await nftOwner.getAddress()
    )

    assert(
      (await nftDatatoken.isDatatokenDeployer(
        nftAddress,
        await nftOwner.getAddress()
      )) === true
    )

    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await user1.getAddress()))

    await nftDatatoken.safeTransferNft(
      nftAddress,
      await user1.getAddress(),
      await nftOwner.getAddress(),
      1
    )

    assert((await nftDatatoken.getNftOwner(nftAddress)) === (await nftOwner.getAddress()))
  })

  // Clear permisions
  it('#cleanPermissions - should fail to cleanPermissions if NOT NFTOwner', async () => {
    nftDatatoken = new Nft(nftOwner, 8996)

    try {
      await nftDatatoken.cleanPermissions(nftAddress, await user2.getAddress())
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not NFT Owner')
    }
  })

  it('#cleanPermissions - should cleanPermissions if NFTOwner', async () => {
    await nftDatatoken.addManager(
      nftAddress,
      await nftOwner.getAddress(),
      await user1.getAddress()
    )
    await nftDatatoken.addDatatokenDeployer(
      nftAddress,
      await user1.getAddress(),
      await user2.getAddress()
    )
    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user2.getAddress())) ===
        true
    )

    await nftDatatoken.cleanPermissions(nftAddress, await nftOwner.getAddress())

    assert(
      (await nftDatatoken.isDatatokenDeployer(nftAddress, await user2.getAddress())) ===
        false
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .manager === false
    )
  })

  it('#setMetaData - should succeed to update metadata if metadataUpdater', async () => {
    await nftDatatoken.addManager(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress()
    )
    await nftDatatoken.addMetadataUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress()
    )

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await nftOwner.getAddress()))
        .updateMetadata === true
    )
    await nftDatatoken.setMetadata(
      nftAddress,
      await nftOwner.getAddress(),
      1,
      'http://myprovider:8030',
      '0x123',
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress())),
      ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress())),
      '0x' +
        sha256(
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress()))
        ).toString()
    )

    const metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[0] === 'http://myprovider:8030')
    assert(metadata[1] === '0x123')
  })

  it('#setMetaData - should fail to update metadata if NOT metadataUpdater', async () => {
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user3.getAddress()))
        .updateMetadata === false
    )
    try {
      await nftDatatoken.setMetadata(
        nftAddress,
        await user3.getAddress(),
        1,
        'http://myprovider:8030',
        '0x123',
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress())),
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress())),
        '0x' +
          sha256(
            ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress()))
          ).toString()
      )
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Metadata updater')
    }
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user3.getAddress()))
        .updateMetadata === false
    )
  })

  it('#setMetaDataState - should succeed to update MetadataState if metadataUpdater', async () => {
    await nftDatatoken.addManager(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress()
    )
    await nftDatatoken.addMetadataUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress()
    )
    let metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[2] === 1)

    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await nftOwner.getAddress()))
        .updateMetadata === true
    )

    await nftDatatoken.setMetadataState(nftAddress, await nftOwner.getAddress(), 2)

    metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[2] === 2)
  })

  it('#setMetaDataState - should fail to update MetadataState if NOT metadataUpdater', async () => {
    let metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[2] === 2)
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user3.getAddress()))
        .updateMetadata === false
    )
    try {
      await nftDatatoken.setMetadataState(nftAddress, await user3.getAddress(), 1)
      assert(false)
    } catch (e) {
      assert(e.message === 'Caller is not Metadata updater')
    }
    metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[2] === 2)
  })

  it('#setTokenURI - should update TokenURI', async () => {
    const trxReceipt = await nftDatatoken.setTokenURI(nftAddress, 'test')
    const tx = await trxReceipt.wait()
    const TokenURIUpdateEvent = getEventFromTx(tx, 'TokenURIUpdate')
    assert(TokenURIUpdateEvent)
  })

  it('#setMetaDataAndTokenURI - should update tokenURI and set metadata', async () => {
    const data = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user2.getAddress()))
    const metadataAndTokenURI: MetadataAndTokenURI = {
      metaDataState: 1,
      metaDataDecryptorUrl: 'http://myprovider:8030',
      metaDataDecryptorAddress: '0x123',
      flags: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user1.getAddress())),
      data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(await user1.getAddress())),
      metaDataHash: '0x' + sha256(data).toString(),
      tokenId: 1,
      tokenURI: 'https://anothernewurl.com/nft/',
      metadataProofs: []
    }
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await nftOwner.getAddress()))
        .updateMetadata === true
    )

    const tx = await nftDatatoken.setMetadataAndTokenURI(
      nftAddress,
      await nftOwner.getAddress(),
      metadataAndTokenURI
    )
    const trxReceipt = await tx.wait()
    const TokenURIUpdateEvent = getEventFromTx(trxReceipt, 'TokenURIUpdate')
    const MetadataUpdatedEvent = getEventFromTx(trxReceipt, 'MetadataUpdated')

    assert(TokenURIUpdateEvent)
    assert(MetadataUpdatedEvent)

    const metadata = await nftDatatoken.getMetadata(nftAddress)
    assert(metadata[0] === metadataAndTokenURI.metaDataDecryptorUrl)
    assert(metadata[1] === metadataAndTokenURI.metaDataDecryptorAddress)
  })

  it('#setData - should FAIL to set a value into 725Y standard, if Caller has NOT store updater permission', async () => {
    const key = '0x1234'
    const data = 'NewData'
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await user1.getAddress()))
        .store === false
    )

    try {
      await nftDatatoken.setData(nftAddress, await user1.getAddress(), key, data)
      assert(false)
    } catch (e) {
      assert(e.message === 'User is not ERC20 store updater')
    }
  })

  it('#setData - should set a value into 725Y standard, if Caller has store updater permission', async () => {
    const key = '0x1234'
    const data = 'NewData'

    // add store updater permission
    await nftDatatoken.addStoreUpdater(
      nftAddress,
      await nftOwner.getAddress(),
      await nftOwner.getAddress()
    )
    assert(
      (await nftDatatoken.getNftPermissions(nftAddress, await nftOwner.getAddress()))
        .store === true
    )

    await nftDatatoken.setData(nftAddress, await nftOwner.getAddress(), key, data)

    assert((await nftDatatoken.getData(nftAddress, key)) === data)
  })
})
