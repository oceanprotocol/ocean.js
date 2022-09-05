import { assert } from 'chai'
import { AbiItem } from 'web3-utils'
import { web3, getTestConfig, getAddresses } from '../config'
import {
  Config,
  approve,
  VeOcean,
  VeFeeDistributor,
  sendTx,
  calculateEstimatedGas
} from '../../src'

describe('veOcean tests', async () => {
  let config: Config
  let addresses: any
  let veOcean: VeOcean
  let veFeeDistributor: VeFeeDistributor
  let ownerAccount: string
  let Alice: string
  let Bob: string

  before(async () => {
    config = await getTestConfig(web3)
  })

  it('initialize accounts', async () => {
    addresses = getAddresses()
    const accounts = await web3.eth.getAccounts()
    ownerAccount = accounts[0]
    console.log('owner:' + ownerAccount)
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
      },
      {
        constant: true,
        inputs: [],
        name: 'owner',
        outputs: [{ name: '', type: 'address' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      },
      {
        constant: true,
        inputs: [{ name: 'owner', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ] as AbiItem[]
    const tokenContract = new web3.eth.Contract(minAbi, addresses.Ocean)
    const oceanOwner = await tokenContract.methods.owner().call()
    console.log('Ocean owner:' + oceanOwner)
    const ownerOceanBalance = await tokenContract.methods.balanceOf(oceanOwner).call()
    console.log('owner ocean balance:' + ownerOceanBalance)
    console.log('Mint OCEAN(' + addresses.Ocean + ') for Alice')
    const estGas = await calculateEstimatedGas(
      ownerAccount,
      tokenContract.methods.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    console.log('Estimated gas for mint:' + estGas)
    await sendTx(
      ownerAccount,
      estGas,
      web3,
      1,
      tokenContract.methods.mint,
      Alice,
      web3.utils.toWei('1000')
    )
    console.log('Mint OCEAN(' + addresses.Ocean + ') for Bob')
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

    if (currentBalance > 0 || currentLock > 0) {
      // we already have some locked tokens, so our transaction should fail
      try {
        await veOcean.lockTokens(Alice, amount, unlockTime)
        assert(false, 'This should fail!')
      } catch (e) {
        // do nothing
      }
    } else {
      const tx = await veOcean.lockTokens(Alice, amount, unlockTime)
      // check events
      assert(tx.events.Deposit.returnValues[0] === Alice)
      assert(tx.events.Deposit.returnValues[1] === amount)
      assert(tx.events.Deposit.returnValues[2] > 0) // we cannot compare it to the actual untiLock, because contract will round it to weeks
      assert(tx.events.Supply.returnValues[1] > tx.events.Supply.returnValues[0]) // supply has increased
    }
  })

  it('Alice should increase the lock time', async () => {
    // since we can only lock once, we test if tx fails or not
    // so if there is already a lock, skip it
    const currentLock = await veOcean.lockEnd(Alice)
    const newLock = parseInt(String(currentLock)) + 7 * 86400
    await veOcean.increaseUnlockTime(Alice, newLock)
    const newCurrentLock = await veOcean.lockEnd(Alice)
    assert(newCurrentLock > currentLock, 'Lock time should change"')
  })

  it('Alice should increase the locked amount', async () => {
    // since we can only lock once, this test will fail if runned twice or more
    // so if there is already a lock, skip it
    const currentBalance = await veOcean.getLockedAmount(Alice)
    const currentLock = await veOcean.lockEnd(Alice)
    const amount = '200'
    await approve(web3, config, Alice, addresses.Ocean, addresses.veOCEAN, amount)
    const estGas = await veOcean.increaseAmount(Alice, amount, true)
    console.log('Estimated gas for increaseAmount:' + estGas)
    await veOcean.increaseAmount(Alice, amount)
    const newCurrentBalance = await veOcean.getLockedAmount(Alice)
    const newCurrentLock = await veOcean.lockEnd(Alice)
    assert(newCurrentLock === currentLock, 'Lock time should not change')
    assert(newCurrentBalance > currentBalance, 'Amount error')
  })
})
