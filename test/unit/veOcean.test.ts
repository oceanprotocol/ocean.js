import { assert } from 'chai'
import { getTestConfig, provider, getAddresses } from '../config'
import {
  Config,
  approve,
  VeOcean,
  sendTx,
  NftFactory,
  VeAllocate,
  getEventFromTx,
  amountToUnits
} from '../../src'
import { ethers, Signer } from 'ethers'
describe('veOcean tests', () => {
  let config: Config
  let addresses: any
  let nftFactory
  let veOcean: VeOcean
  let veAllocate: VeAllocate
  let ownerAccount
  let Alice
  let Bob
  let nft1, nft2, nft3
  let chainId

  before(async () => {
    ownerAccount = (await provider.getSigner(0)) as Signer
    Alice = (await provider.getSigner(1)) as Signer
    Bob = (await provider.getSigner(2)) as Signer
    config = await getTestConfig(ownerAccount as Signer)
    addresses = await getAddresses()
  })

  it('initialize accounts', async () => {
    chainId = (await Alice.provider.getNetwork())?.chainId
    const minAbi = [
      {
        constant: false,
        inputs: [
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' }
        ],
        name: 'mint',
        outputs: [{ name: '', type: 'bool' }],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function'
      }
    ]
    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi, ownerAccount)
    const estGas = await tokenContract.estimateGas.mint(
      await Alice.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    await sendTx(
      estGas,
      ownerAccount,
      1,
      tokenContract.mint,
      await Alice.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    await sendTx(
      estGas,
      ownerAccount,
      1,
      tokenContract.mint,
      await Bob.getAddress(),
      amountToUnits(null, null, '1000', 18)
    )
    veOcean = new VeOcean(addresses.veOCEAN, Alice)
    veAllocate = new VeAllocate(addresses.veAllocate, Alice)
    nftFactory = new NftFactory(addresses.ERC721Factory, Alice)
  })

  it('Alice should lock 100 Ocean', async () => {
    // since we can only lock once, we test if tx fails or not
    // so if there is already a lock, skip it
    const currentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const amount = '100'
    await approve(
      Alice,
      config,
      await Alice.getAddress(),
      addresses.Ocean,
      addresses.veOCEAN,
      amount
    )
    const timestamp = Math.floor(Date.now() / 1000)
    const unlockTime = timestamp + 7 * 86400

    if (parseInt(currentBalance) > 0 || currentLock > 0) {
      // we already have some locked tokens, so our transaction should fail
      try {
        await veOcean.lockTokens(amount, unlockTime)
        assert(false, 'This should fail!')
      } catch (e) {
        // do nothing
      }
    } else {
      const response = await veOcean.lockTokens(amount, unlockTime)
      const tx = await response.wait()
      // check events
      const depositEvent = getEventFromTx(tx, 'Deposit')
      const supplyEvent = getEventFromTx(tx, 'Supply')
      assert(
        depositEvent.args[0].toLowerCase() === (await Alice.getAddress()).toLowerCase()
      )
      assert(
        depositEvent.args[1].toString() ===
          (await amountToUnits(null, null, amount, 18)).toString()
      )
      assert(depositEvent.args[2] > 0) // we cannot compare it to the actual untiLock, because contract will round it to weeks
      assert(depositEvent.args[1] > supplyEvent.args[0]) // supply has increased
    }
  })

  it('Alice should increase the lock time', async () => {
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const newLock = parseInt(String(currentLock)) + 7 * 86400 + 20
    const tx = await veOcean.increaseUnlockTime(newLock)
    await tx.wait()
    const newCurrentLock = await veOcean.lockEnd(await Alice.getAddress())
    assert(newCurrentLock > currentLock, 'Lock time should change"')
  })

  it('Alice should increase the locked amount', async () => {
    const currentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const amount = '200'
    let tx = await approve(
      Alice,
      config,
      await Alice.getAddress(),
      addresses.Ocean,
      addresses.veOCEAN,
      amount
    )
    tx = await veOcean.increaseAmount(amount)
    await tx.wait()
    const newCurrentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const newCurrentLock = await veOcean.lockEnd(await Alice.getAddress())
    assert(newCurrentLock === currentLock, 'Lock time should not change')
    assert(
      parseFloat(newCurrentBalance) > parseFloat(currentBalance),
      'Amount error:' + newCurrentBalance + ' shoud be > than ' + currentBalance
    )
  })

  it('Alice should publish 3 NFTs', async () => {
    // publish 3 nfts
    nft1 = await nftFactory.createNFT({
      name: 'testNft1',
      symbol: 'TSTF1',
      templateIndex: 1,
      tokenURI: '',
      transferable: 1,
      owner: await Alice.getAddress()
    })
    nft2 = await nftFactory.createNFT({
      name: 'testNft2',
      symbol: 'TSTF2',
      templateIndex: 1,
      tokenURI: '',
      transferable: 1,
      owner: await Alice.getAddress()
    })
    nft3 = await nftFactory.createNFT({
      name: 'testNft3',
      symbol: 'TSTF3',
      templateIndex: 1,
      tokenURI: '',
      transferable: 1,
      owner: await Alice.getAddress()
    })
  })

  it('Alice should allocate 10% to NFT1', async () => {
    const totalAllocation = await veAllocate.getTotalAllocation(await Alice.getAddress())
    const response = await veAllocate.setAllocation('1000', nft1, chainId)
    const tx = await response.wait()
    const allocationSetEvent = getEventFromTx(tx, 'AllocationSet')
    assert(
      allocationSetEvent.args[0].toLowerCase() ===
        (await Alice.getAddress()).toLowerCase(),
      'Incorect address'
    )
    assert(allocationSetEvent.args[1] === nft1, 'Incorect NFT address')
    assert(parseInt(allocationSetEvent.args[2]) === parseInt(chainId), 'Incorect chainId')
    assert(parseInt(allocationSetEvent.args[3]) === 1000, 'Incorect ammount')
    const newTotalAllocation = await veAllocate.getTotalAllocation(
      await Alice.getAddress()
    )
    const expectedAllocation = parseInt(String(totalAllocation)) + 1000
    assert(
      parseInt(String(newTotalAllocation)) === parseInt(String(expectedAllocation)),
      'NewAllocation (' + newTotalAllocation + ') should be ' + expectedAllocation
    )
    const nftAllocation = await veAllocate.getVeAllocation(
      await Alice.getAddress(),
      nft1,
      chainId
    )
    assert(
      parseInt(String(nftAllocation)) === parseInt('1000'),
      nftAllocation + ' should be 1000'
    )
  })

  it('Alice should allocate 10% to NFT2 and 20% to NFT3', async () => {
    const totalAllocation = await veAllocate.getTotalAllocation(await Alice.getAddress())
    const response = await veAllocate.setBatchAllocation(
      ['1000', '2000'],
      [nft2, nft3],
      [chainId, chainId]
    )
    const tx = await response.wait()
    const allocationSetEvent = getEventFromTx(tx, 'AllocationSetMultiple')
    assert(
      allocationSetEvent.args[0].toLowerCase() ===
        (await Alice.getAddress()).toLowerCase()
    )
    assert(allocationSetEvent.args[1][0] === nft2)
    assert(allocationSetEvent.args[1][1] === nft3)
    assert(parseInt(allocationSetEvent.args[2][0]) === parseInt(chainId))
    assert(parseInt(allocationSetEvent.args[3][0]) === 1000)
    assert(parseInt(allocationSetEvent.args[3][1]) === 2000)
    const newTotalAllocation = await veAllocate.getTotalAllocation(
      await Alice.getAddress()
    )
    const expectedAllocation = parseInt(String(totalAllocation)) + 3000
    assert(
      parseInt(String(newTotalAllocation)) === parseInt(String(expectedAllocation)),
      'NewAllocation (' + newTotalAllocation + ') should be ' + expectedAllocation
    )
    let nftAllocation = await veAllocate.getVeAllocation(
      await Alice.getAddress(),
      nft2,
      chainId
    )
    assert(
      parseInt(String(nftAllocation)) === parseInt('1000'),
      nftAllocation + ' should be 1000'
    )
    nftAllocation = await veAllocate.getVeAllocation(
      await Alice.getAddress(),
      nft3,
      chainId
    )
    assert(
      parseInt(String(nftAllocation)) === parseInt('2000'),
      nftAllocation + ' should be 2000'
    )
  })
})
