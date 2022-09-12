import { assert } from 'chai'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  approve,
  VeOcean,
  VeFeeDistributor,
  sendTx,
  calculateEstimatedGas,
  NftFactory,
  VeAllocate,
  VeFeeEstimate
} from '../../src'

describe('veOcean tests', async () => {
  let config: Config
  let addresses: any
  let nftFactory
  let veOcean: VeOcean
  let veFeeDistributor: VeFeeDistributor
  let veFeeEstimate: VeFeeEstimate
  let veAllocate: VeAllocate
  let ownerAccount: string
  let Alice: string
  let Bob: string
  let nft1, nft2, nft3
  let chainId

  before(async () => {
    config = await getTestConfig(web3)
  })

  it('initialize accounts', async () => {
    addresses = getAddresses()
    const accounts = await web3.eth.getAccounts()
    chainId = await web3.eth.getChainId()
    ownerAccount = accounts[0]
    Alice = accounts[1]
    Bob = accounts[2]
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
    ] as AbiItem[]
    const tokenContract = new web3.eth.Contract(minAbi, addresses.Ocean)
    const estGas = await calculateEstimatedGas(
      ownerAccount,
      tokenContract.methods.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    await sendTx(
      ownerAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    await sendTx(
      ownerAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      Bob,
      web3.utils.toWei('1000')
    )
    veOcean = new VeOcean(addresses.veOCEAN, web3)
    veFeeDistributor = new VeFeeDistributor(addresses.veFeeDistributor, web3)
    veAllocate = new VeAllocate(addresses.veAllocate, web3)
    veFeeEstimate = new VeFeeEstimate(addresses.veFeeEstimate, web3)
    nftFactory = new NftFactory(addresses.ERC721Factory, web3)
  })

  it('Alice should lock 100 Ocean', async () => {
    // since we can only lock once, we test if tx fails or not
    // so if there is already a lock, skip it
    const currentBalance = await veOcean.getLockedAmount(Alice)
    const currentLock = await veOcean.lockEnd(Alice)
    const amount = '100'
    await approve(web3, config, Alice, addresses.Ocean, addresses.veOCEAN, amount)
    const timestamp = Math.floor(Date.now() / 1000)
    const unlockTime = timestamp + 7 * 86400

    if (parseInt(currentBalance) > 0 || currentLock > 0) {
      // we already have some locked tokens, so our transaction should fail
      try {
        await veOcean.lockTokens(Alice, amount, unlockTime)
        assert(false, 'This should fail!')
      } catch (e) {
        // do nothing
      }
    } else {
      const estGas = await veOcean.lockTokens(Alice, amount, unlockTime, true)
      console.log('Estimate gas for lockTokens:' + estGas)
      const tx = await veOcean.lockTokens(Alice, amount, unlockTime)
      // check events
      assert(tx.events.Deposit.returnValues[0] === Alice)
      assert(tx.events.Deposit.returnValues[1] === web3.utils.toWei(amount))
      assert(tx.events.Deposit.returnValues[2] > 0) // we cannot compare it to the actual untiLock, because contract will round it to weeks
      assert(tx.events.Supply.returnValues[1] > tx.events.Supply.returnValues[0]) // supply has increased
    }
  })

  it('Alice should increase the lock time', async () => {
    const currentLock = await veOcean.lockEnd(Alice)
    const newLock = parseInt(String(currentLock)) + 7 * 86400
    await veOcean.increaseUnlockTime(Alice, newLock)
    const newCurrentLock = await veOcean.lockEnd(Alice)
    assert(newCurrentLock > currentLock, 'Lock time should change"')
  })

  it('Alice should increase the locked amount', async () => {
    const currentBalance = await veOcean.getLockedAmount(Alice)
    const currentLock = await veOcean.lockEnd(Alice)
    const amount = '200'
    await approve(web3, config, Alice, addresses.Ocean, addresses.veOCEAN, amount)
    await veOcean.increaseAmount(Alice, amount)
    const newCurrentBalance = await veOcean.getLockedAmount(Alice)
    const newCurrentLock = await veOcean.lockEnd(Alice)
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
    const totalAllocation = await veAllocate.getTotalAllocation(Alice)
    const tx = await veAllocate.setAllocation(Alice, '1000', nft1, chainId)
    assert(tx.events.AllocationSet.returnValues[0] === Alice)
    assert(tx.events.AllocationSet.returnValues[1] === nft1)
    assert(parseInt(tx.events.AllocationSet.returnValues[2]) === parseInt(chainId))
    assert(tx.events.AllocationSet.returnValues[3] === '1000')
    const newTotalAllocation = await veAllocate.getTotalAllocation(Alice)
    const expectedAllocation = parseInt(String(totalAllocation)) + 1000
    assert(
      parseInt(String(newTotalAllocation)) === parseInt(String(expectedAllocation)),
      'NewAllocation (' + newTotalAllocation + ') should be ' + expectedAllocation
    )
    const nftAllocation = await veAllocate.getVeAllocation(Alice, nft1, chainId)
    assert(
      parseInt(String(nftAllocation)) === parseInt('1000'),
      nftAllocation + ' should be 1000'
    )
  })

  it('Alice should allocate 10% to NFT2 and 20% to NFT3', async () => {
    const totalAllocation = await veAllocate.getTotalAllocation(Alice)
    const tx = await veAllocate.setBatchAllocation(
      Alice,
      ['1000', '2000'],
      [nft2, nft3],
      [chainId, chainId]
    )
    assert(tx.events.AllocationSetMultiple.returnValues[0] === Alice)
    assert(tx.events.AllocationSetMultiple.returnValues[1][0] === nft2)
    assert(tx.events.AllocationSetMultiple.returnValues[1][1] === nft3)
    assert(
      parseInt(tx.events.AllocationSetMultiple.returnValues[2][0]) === parseInt(chainId)
    )
    assert(tx.events.AllocationSetMultiple.returnValues[3][0] === '1000')
    assert(tx.events.AllocationSetMultiple.returnValues[3][1] === '2000')
    const newTotalAllocation = await veAllocate.getTotalAllocation(Alice)
    const expectedAllocation = parseInt(String(totalAllocation)) + 3000
    assert(
      parseInt(String(newTotalAllocation)) === parseInt(String(expectedAllocation)),
      'NewAllocation (' + newTotalAllocation + ') should be ' + expectedAllocation
    )
    let nftAllocation = await veAllocate.getVeAllocation(Alice, nft2, chainId)
    assert(
      parseInt(String(nftAllocation)) === parseInt('1000'),
      nftAllocation + ' should be 1000'
    )
    nftAllocation = await veAllocate.getVeAllocation(Alice, nft3, chainId)
    assert(
      parseInt(String(nftAllocation)) === parseInt('2000'),
      nftAllocation + ' should be 2000'
    )
  })

  it('Alice should be able to estimate her claim amount', async () => {
    const estimatedClaim = await veFeeEstimate.estimateClaim(Alice)
    // since we have no rewards, we are expecting 0
    assert(estimatedClaim === '0')
  })
})
