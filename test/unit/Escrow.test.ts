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
  let user4: Signer
  let user5: Signer
  let Escrow: EscrowContract
  let datatoken: Datatoken
  let addresses
  let OCEAN

  before(async () => {
    user1 = (await provider.getSigner(3)) as Signer
    user2 = (await provider.getSigner(4)) as Signer
    user3 = (await provider.getSigner(5)) as Signer
    user4 = (await provider.getSigner(6)) as Signer
    user5 = (await provider.getSigner(7)) as Signer

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
    assert(tx !== undefined, 'authorize returned undefined')
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
    const payee = await user3.getAddress()
    const jobId = Date.now().toString()
    const amountUnits = await amountToUnits(null, null, '10', 18)
    const escrowPayee = new EscrowContract(
      addresses.Escrow,
      user3,
      Number(await user3.provider.getNetwork().then((n) => n.chainId))
    )

    await Escrow.authorize(OCEAN, payee, '20', '100', '3')
    await escrowPayee.contract.createLock(jobId, OCEAN, payer, amountUnits, '100')
    const locksBefore = await escrowPayee.getLocks(OCEAN, payer, payee)
    const initialLock = locksBefore.find((lock) => lock.jobId.toString() === jobId)
    assert(initialLock, 'initial lock not found')
    const startTimeBefore = initialLock.startTime.toString()

    const tx = await escrowPayee.reLock(jobId, OCEAN, payer, '20', '90')
    assert(tx, 'failed to reLock existing lock')
    const receipt = await tx.wait()
    assert(receipt, 'reLock receipt not found')
    const block = await provider.getBlock(receipt.blockNumber)
    assert(block, 'reLock block not found')

    const locksAfter = await escrowPayee.getLocks(OCEAN, payer, payee)
    const updatedLock = locksAfter.find((lock) => lock.jobId.toString() === jobId)
    assert(updatedLock, 'updated lock not found')
    assert(
      updatedLock.startTime.toString() === startTimeBefore,
      'startTime changed after reLock'
    )

    const expectedAmount = await amountToUnits(null, null, '20', 18)
    assert(updatedLock.amount.toString() === expectedAmount, 'reLock amount mismatch')
    assert(
      updatedLock.expiry.toString() ===
        new BigNumber(block.timestamp).plus('90').toString(),
      'reLock expiry mismatch'
    )
  })

  it('should reLocks multiple existing locks', async () => {
    const payer = await user2.getAddress()
    const payee = await user5.getAddress()
    const base = Date.now()
    const jobIds = [base.toString(), (base + 1).toString()]
    const [jobId1002, jobId1003] = jobIds
    const amounts = ['5', '6']
    const expiries = ['50', '60']
    const amountUnits = [
      await amountToUnits(null, null, amounts[0], 18),
      await amountToUnits(null, null, amounts[1], 18)
    ]

    const escrowPayee = new EscrowContract(
      addresses.Escrow,
      user5,
      Number(await user5.provider.getNetwork().then((n) => n.chainId))
    )

    await Escrow.authorize(OCEAN, payee, '20', '100', '3')
    await escrowPayee.contract.createLocks(
      jobIds,
      [OCEAN, OCEAN],
      [payer, payer],
      amountUnits,
      expiries
    )

    const locksBefore = await escrowPayee.getLocks(OCEAN, payer, payee)
    const startTime1002 = locksBefore
      .find((lock) => lock.jobId.toString() === jobId1002)
      ?.startTime.toString()
    const startTime1003 = locksBefore
      .find((lock) => lock.jobId.toString() === jobId1003)
      ?.startTime.toString()
    assert(startTime1002, 'startTime for lock 1002 not found')
    assert(startTime1003, 'startTime for lock 1003 not found')

    const tx = await escrowPayee.reLocks(
      jobIds,
      [OCEAN, OCEAN],
      [payer, payer],
      ['10', '9'],
      ['80', '90']
    )
    assert(tx, 'failed to reLocks existing locks')
    const receipt = await tx.wait()
    assert(receipt, 'reLocks receipt not found')
    const block = await provider.getBlock(receipt.blockNumber)
    assert(block, 'reLocks block not found')

    const locksAfter = await escrowPayee.getLocks(OCEAN, payer, payee)
    const updated = locksAfter.filter((lock) =>
      [jobId1002, jobId1003].includes(lock.jobId.toString())
    )
    assert(updated.length === 2, 'expected 2 updated locks')

    const lock1002 = updated.find((lock) => lock.jobId.toString() === jobId1002)
    const lock1003 = updated.find((lock) => lock.jobId.toString() === jobId1003)
    assert(lock1002, 'lock 1002 not found')
    assert(lock1003, 'lock 1003 not found')

    const expectedAmount1002 = await amountToUnits(null, null, '10', 18)
    const expectedAmount1003 = await amountToUnits(null, null, '9', 18)
    assert(lock1002.amount.toString() === expectedAmount1002, 'lock 1002 amount mismatch')
    assert(
      lock1002.expiry.toString() === new BigNumber(block.timestamp).plus('80').toString(),
      'lock 1002 expiry mismatch'
    )
    assert(lock1003.amount.toString() === expectedAmount1003, 'lock 1003 amount mismatch')
    assert(
      lock1003.expiry.toString() === new BigNumber(block.timestamp).plus('90').toString(),
      'lock 1003 expiry mismatch'
    )
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
