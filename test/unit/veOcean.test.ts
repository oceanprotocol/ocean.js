import { assert } from 'chai'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses, provider } from '../config'
import {
  Config,
  approve,
  VeOcean,
  VeFeeDistributor,
  sendTx,
  calculateEstimatedGas,
  NftFactory,
  VeAllocate,
  VeFeeEstimate,
  getEventFromTx
} from '../../src'
import { ethers, InterfaceAbi, Interface, Signer } from 'ethers'

describe('veOcean tests', async () => {
  let config: Config
  let addresses: any
  let nftFactory
  let veOcean: VeOcean
  let veFeeDistributor: VeFeeDistributor
  let veFeeEstimate: VeFeeEstimate
  let veAllocate: VeAllocate
  const ownerAccount = (await provider.getSigner(0)) as Signer
  const Alice = (await provider.getSigner(1)) as Signer
  const Bob = (await provider.getSigner(2)) as Signer
  let nft1, nft2, nft3
  let chainId

  before(async () => {
    config = await getTestConfig(ownerAccount as Signer)
  })

  it('initialize accounts', async () => {
    chainId = (await Alice.provider.getNetwork()).chainId
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
    const tokenContract = new ethers.Contract(addresses.Ocean, minAbi)
    const estGas = await calculateEstimatedGas(
      tokenContract.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    await sendTx(
      estGas,
      ownerAccount,
      1,
      tokenContract.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    await sendTx(
      estGas,
      ownerAccount,
      1,
      tokenContract.mint,
      Bob,
      web3.utils.toWei('1000')
    )
    veOcean = new VeOcean(addresses.veOCEAN, Alice)
    veFeeDistributor = new VeFeeDistributor(addresses.veFeeDistributor, Alice)
    veAllocate = new VeAllocate(addresses.veAllocate, Alice)
    veFeeEstimate = new VeFeeEstimate(addresses.veFeeEstimate, Alice)
    nftFactory = new NftFactory(addresses.ERC721Factory, Alice)
  })

  it('Alice should lock 100 Ocean', async () => {
    // since we can only lock once, we test if tx fails or not
    // so if there is already a lock, skip it
    const currentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const amount = '100'
    await approve(
      web3,
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
      const estGas = await veOcean.lockTokens(amount, unlockTime, true)
      console.log('Estimate gas for lockTokens:' + estGas)
      const response = await veOcean.lockTokens(amount, unlockTime)
      const tx = await response.wait()
      // check events
      const depositEvent = getEventFromTx(tx, 'Deposit')
      const supplyEvent = getEventFromTx(tx, 'Supply')
      assert(depositEvent.args[0] === Alice)
      assert(depositEvent.args[1] === web3.utils.toWei(amount))
      assert(depositEvent.args[2] > 0) // we cannot compare it to the actual untiLock, because contract will round it to weeks
      assert(depositEvent.args[1] > supplyEvent.args[0]) // supply has increased
    }
  })

  it('Alice should increase the lock time', async () => {
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const newLock = parseInt(String(currentLock)) + 7 * 86400
    await veOcean.increaseUnlockTime(newLock)
    const newCurrentLock = await veOcean.lockEnd(await Alice.getAddress())
    assert(newCurrentLock > currentLock, 'Lock time should change"')
  })

  it('Alice should increase the locked amount', async () => {
    const currentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const currentLock = await veOcean.lockEnd(await Alice.getAddress())
    const amount = '200'
    await approve(
      web3,
      config,
      await Alice.getAddress(),
      addresses.Ocean,
      addresses.veOCEAN,
      amount
    )
    await veOcean.increaseAmount(amount)
    const newCurrentBalance = await veOcean.getLockedAmount(await Alice.getAddress())
    const newCurrentLock = await veOcean.lockEnd(await Alice.getAddress())
    assert(newCurrentLock === currentLock, 'Lock time should not change')
    assert(
      newCurrentBalance > currentBalance,
      'Amount error:' + newCurrentBalance + ' shoud be > than ' + currentBalance
    )
  })

  it('Alice should publish 3 NFTs', async () => {
    // publish 3 nfts
    nft1 = await nftFactory.createNFT(Alice, {
      name: 'testNft1',
      symbol: 'TSTF1',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: Alice
    })
    nft2 = await nftFactory.createNFT(Alice, {
      name: 'testNft2',
      symbol: 'TSTF2',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: Alice
    })
    nft3 = await nftFactory.createNFT(Alice, {
      name: 'testNft3',
      symbol: 'TSTF3',
      templateIndex: 1,
      tokenURI: '',
      transferable: true,
      owner: Alice
    })
  })

  it('Alice should allocate 10% to NFT1', async () => {
    const totalAllocation = await veAllocate.getTotalAllocation(await Alice.getAddress())
    const response = await veAllocate.setAllocation('1000', nft1, chainId)
    const tx = await response.wait()
    const allocationSetEvent = getEventFromTx(tx, 'AllocationSet')
    assert(allocationSetEvent.args[0] === Alice)
    assert(allocationSetEvent.args[1] === nft1)
    assert(parseInt(allocationSetEvent.args[2]) === parseInt(chainId))
    assert(allocationSetEvent.args[3] === '1000')
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
    assert(allocationSetEvent.args[0] === Alice)
    assert(allocationSetEvent.args[1][0] === nft2)
    assert(allocationSetEvent.args[1][1] === nft3)
    assert(parseInt(allocationSetEvent.args[2][0]) === parseInt(chainId))
    assert(allocationSetEvent.args[3][0] === '1000')
    assert(allocationSetEvent.args[3][1] === '2000')
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

  it('Alice should be able to estimate her claim amount', async () => {
    const estimatedClaim = await veFeeEstimate.estimateClaim(await Alice.getAddress())
    // since we have no rewards, we are expecting 0
    assert(estimatedClaim === '0')
  })
})
