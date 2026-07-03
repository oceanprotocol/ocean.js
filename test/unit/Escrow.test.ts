import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer } from 'ethers'

import { Datatoken, amountToUnits, unitsToAmount } from '../../src/'
import { EscrowContract } from '../../src/contracts/Escrow'
import BigNumber from 'bignumber.js'

describe('Escrow payments flow', () => {
  let user1: Signer
  let user2: Signer
  let user3: Signer
  let Escrow: EscrowContract
  let datatoken: Datatoken
  let addresses
  let OCEAN

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    user2 = (await provider.getSigner(4)) as Signer
    user3 = (await provider.getSigner(5)) as Signer

    addresses = await getAddresses()
    OCEAN = addresses.Ocean
  })

  it('should initialize Escrow class', async () => {
    const { chainId } = await user2.provider.getNetwork()
    Escrow = new EscrowContract(addresses.Escrow, user2, Number(chainId))
    assert(Escrow !== null)
  })

  it('User2 makes a deposit in Escrow', async () => {
    const { chainId } = await user2.provider.getNetwork()
    datatoken = new Datatoken(user2, Number(chainId))
    const initialBalance = await datatoken.balance(OCEAN, await user2.getAddress())
    const initialDepositedEscrow = await Escrow.getUserFunds(
      await user2.getAddress(),
      OCEAN
    )
    const initialDepositedEscrowAmount = await unitsToAmount(
      null,
      null,
      initialDepositedEscrow[0].toString(),
      18
    )

    await datatoken.approve(OCEAN, await user2.getAddress(), '1000')

    await datatoken.transfer(OCEAN, await user2.getAddress(), '1000')

    assert(
      (await datatoken.balance(OCEAN, await user2.getAddress())) !==
        `${initialBalance + 1000}`
    )

    await datatoken.approve(OCEAN, addresses.Escrow, '1000')
    await Escrow.deposit(OCEAN, '100')

    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = new BigNumber(funds[0])
    const expectedAmount = await amountToUnits(
      null,
      null,
      String(Number(initialDepositedEscrowAmount) + 100),
      18
    )
    assert(available.toString() === expectedAmount)
  })

  it('Withdraws funds', async () => {
    const availableUserFunds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const availableUserFundsAmount = await unitsToAmount(
      null,
      null,
      availableUserFunds[0].toString(),
      18
    )

    const tx = await Escrow.withdraw([OCEAN], ['50'])

    assert(tx, 'failed to withdraw half of available tokens')
    const funds = await Escrow.getUserFunds(await user2.getAddress(), OCEAN)
    const available = new BigNumber(funds[0])
    const expectedAmount = await amountToUnits(
      null,
      null,
      String(Number(availableUserFundsAmount) - 50),
      18
    )
    assert(available.toString() === expectedAmount)
  })

  it('Authorize user1', async () => {
    const tx = await Escrow.authorize(OCEAN, await user1.getAddress(), '20', '100', '3')
    assert(tx, 'failed to authorize user1')
    const auths = await Escrow.getAuthorizations(
      OCEAN,
      await user2.getAddress(),
      await user1.getAddress()
    )
    assert(auths[0][0] === (await user1.getAddress()), 'payee address not present')
  })

  it('should estimate gas for bundle', async () => {
    const estimateGas = await Escrow.bundle(
      [{ token: OCEAN, amount: '1' }],
      [],
      [],
      18,
      true
    )
    assert(typeof estimateGas === 'bigint')
  })

  it('should execute bundle with deposit and authorization', async () => {
    const payer = await user2.getAddress()
    const payee = await user3.getAddress()
    const beforeFunds = new BigNumber((await Escrow.getUserFunds(payer, OCEAN))[0])

    const tx = await Escrow.bundle(
      [{ token: OCEAN, amount: '50' }],
      [],
      [
        {
          token: OCEAN,
          payee,
          maxLockedAmount: '20',
          maxLockSeconds: '100',
          maxLockCounts: '3'
        }
      ]
    )

    assert(tx, 'bundle transaction failed')

    const afterFunds = new BigNumber((await Escrow.getUserFunds(payer, OCEAN))[0])
    const expectedAmount = await amountToUnits(null, null, '50', 18)
    assert(afterFunds.minus(beforeFunds).toString() === expectedAmount)

    const auths = await Escrow.getAuthorizations(OCEAN, payer, payee)
    assert(auths[0][0] === payee, 'bundle authorization payee not present')
  })

  it('should reLock an existing lock', async () => {
    const payer = await user2.getAddress()
    const payee = payer
    const jobId = '7'
    const amountUnits = await amountToUnits(null, null, '10', 18)

    await Escrow.contract.createLock(jobId, OCEAN, payer, amountUnits, '100')
    const locksBefore = await Escrow.getLocks(OCEAN, payer, payee)
    const initialLock = locksBefore.find((lock) => lock.jobId.toString() === jobId)
    assert(initialLock, 'initial lock not found')
    const startTimeBefore = initialLock.startTime.toString()

    const tx = await Escrow.reLock(jobId, OCEAN, payer, '20', '200')
    assert(tx, 'failed to reLock existing lock')

    const locksAfter = await Escrow.getLocks(OCEAN, payer, payee)
    const updatedLock = locksAfter.find((lock) => lock.jobId.toString() === jobId)
    assert(updatedLock, 'updated lock not found')
    assert(
      updatedLock.startTime.toString() === startTimeBefore,
      'startTime changed after reLock'
    )

    const expectedAmount = await amountToUnits(null, null, '20', 18)
    assert(updatedLock.amount.toString() === expectedAmount, 'reLock amount mismatch')
    assert(updatedLock.expiry.toString() === '200', 'reLock expiry mismatch')
  })

  it('should reLocks multiple existing locks', async () => {
    const payer = await user2.getAddress()
    const payee = payer
    const jobIds = ['8', '9']
    const amounts = ['5', '6']
    const expiries = ['150', '250']
    const amountUnits = [
      await amountToUnits(null, null, amounts[0], 18),
      await amountToUnits(null, null, amounts[1], 18)
    ]

    await Escrow.contract.createLocks(
      jobIds,
      [OCEAN, OCEAN],
      [payer, payer],
      amountUnits,
      expiries
    )

    const tx = await Escrow.reLocks(
      jobIds,
      [OCEAN, OCEAN],
      [payer, payer],
      ['10', '12'],
      ['160', '260']
    )
    assert(tx, 'failed to reLocks existing locks')

    const locksAfter = await Escrow.getLocks(OCEAN, payer, payee)
    const updated = locksAfter.filter((lock) =>
      ['8', '9'].includes(lock.jobId.toString())
    )
    assert(updated.length === 2, 'expected 2 updated locks')

    const lock8 = updated.find((lock) => lock.jobId.toString() === '8')
    const lock9 = updated.find((lock) => lock.jobId.toString() === '9')
    assert(lock8, 'lock 8 not found')
    assert(lock9, 'lock 9 not found')

    const expectedAmount8 = await amountToUnits(null, null, '10', 18)
    const expectedAmount9 = await amountToUnits(null, null, '12', 18)
    assert(lock8.amount.toString() === expectedAmount8, 'lock 8 amount mismatch')
    assert(lock8.expiry.toString() === '160', 'lock 8 expiry mismatch')
    assert(lock9.amount.toString() === expectedAmount9, 'lock 9 amount mismatch')
    assert(lock9.expiry.toString() === '260', 'lock 9 expiry mismatch')
  })

  it('should reject reLocks with mismatched input arrays', async () => {
    try {
      await Escrow.reLocks(
        ['10'],
        [OCEAN, OCEAN],
        [await user2.getAddress()],
        ['10'],
        ['100', '200']
      )
      assert(false, 'expected reLocks to throw on mismatched arrays')
    } catch (error) {
      assert(
        error.message.includes('same length'),
        `unexpected error message: ${error.message}`
      )
    }
  })
})
