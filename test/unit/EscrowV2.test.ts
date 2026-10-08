import { assert } from 'chai'
import { provider, getAddresses } from '../config'
import { Signer } from 'ethers'

import { Datatoken } from '../../src/'
import { EscrowContract } from '../../src/contracts/Escrow'
import { EscrowKind } from '../../src/@types/Escrow'

/**
 * Escrow v2 read surface, authorization expiry and prefunded-sponsorship reads (contracts #1057).
 * Skips cleanly unless the deployed escrow advertises the v2 lock-subsidy surface, so it is a no-op
 * on a pre-v2 chain. Lock-based cases reuse the exact deposit + authorize + createLock pattern proven
 * in Escrow.test.ts (createLock is called on the raw contract as the payee — the wrapper does not
 * expose it, since lock creation belongs to ocean-node).
 */
describe('Escrow v2 read surface, auth expiry and sponsorship', () => {
  let payerSigner: Signer
  let payeeSigner: Signer
  let escrow: EscrowContract // bound to the payer
  let escrowPayee: EscrowContract // bound to the payee (creates locks)
  let addresses
  let OCEAN: string
  let payer: string
  let payee: string
  let chainId: number
  let jobCounter = 0

  const nextJobId = () => `${Date.now()}${jobCounter++}`

  before(async function () {
    payerSigner = (await provider.getSigner(4)) as Signer
    payeeSigner = (await provider.getSigner(5)) as Signer
    addresses = await getAddresses()
    OCEAN = addresses.Ocean

    if (!addresses.Escrow) this.skip()
    chainId = Number(await payerSigner.provider.getNetwork().then((n) => n.chainId))
    escrow = new EscrowContract(addresses.Escrow, payerSigner, chainId)
    // v2 feature-detect: skip the whole suite against a legacy escrow.
    if (!(await escrow.isEscrowLockSubsidy())) this.skip()

    escrowPayee = new EscrowContract(addresses.Escrow, payeeSigner, chainId)
    payer = await payerSigner.getAddress()
    payee = await payeeSigner.getAddress()

    // Fund the payer's escrow balance so lock-based cases can run. Skip ONLY when the payer lacks
    // the tokens to fund (an environment limitation, not a defect); let approve/deposit failures
    // propagate so a broken wrapper or contract fails the suite rather than silently skipping.
    const datatoken = new Datatoken(payerSigner, chainId)
    const DEPOSIT = 100
    const balance = Number(await datatoken.balance(OCEAN, payer))
    if (!(balance >= DEPOSIT)) this.skip()
    await datatoken.approve(OCEAN, addresses.Escrow, String(DEPOSIT * 10))
    await escrow.deposit(OCEAN, String(DEPOSIT))
  })

  it('advertises v2 (IEscrowCore + IEscrowLockSubsidy) and version 2', async () => {
    assert.strictEqual(await escrow.version(), 2, 'version is not 2')
    assert.strictEqual(await escrow.isEscrowCore(), true, 'missing IEscrowCore')
    assert.strictEqual(
      await escrow.isEscrowLockSubsidy(),
      true,
      'missing IEscrowLockSubsidy'
    )
  })

  it('reports a known escrowKind and rejects an unsupported interface id', async () => {
    const kind = await escrow.escrowKind()
    assert(kind in EscrowKind, 'escrowKind is not a known EscrowKind')
    assert.strictEqual(
      await escrow.supportsInterface('0xffffffff'),
      false,
      'unsupported id should be false'
    )
  })

  it('exposes enterprise reads consistently with escrowKind', async function () {
    const isEnterprise = await escrow.isEscrowEnterprise()
    if (isEnterprise) {
      assert.strictEqual(await escrow.escrowKind(), EscrowKind.ENTERPRISE)
      assert(typeof (await escrow.feeCollector()) === 'string')
      assert(typeof (await escrow.isTokenAllowed(OCEAN)) === 'boolean')
      assert(typeof (await escrow.previewFee(OCEAN, '1')) === 'string')
    } else {
      // community escrow: not enterprise, and the fee-gate passthroughs are not advertised.
      assert.strictEqual(await escrow.escrowKind(), EscrowKind.COMMUNITY)
    }
  })

  it('reads the sponsor cap', async () => {
    const cap = await escrow.maxSponsorsPerLock()
    assert(
      Number.isInteger(cap) && cap >= 1,
      'maxSponsorsPerLock is not a positive integer'
    )
  })

  it('sponsorship reads are zero/empty for a plain (unsponsored) lock', async () => {
    const jobId = nextJobId()
    await escrow.authorize(OCEAN, payee, '20', '100', '5')
    // Plain payer-funded lock: no subsidy providers.
    await escrowPayee.contract.createLock(
      jobId,
      OCEAN,
      payer,
      '1000000000000000000',
      '100',
      '0',
      []
    )

    const sponsorship = await escrow.getSponsorship(payee, payer, jobId, OCEAN)
    assert.strictEqual(sponsorship.total, '0', 'plain lock should have 0 sponsored total')
    assert.strictEqual(
      sponsorship.providers.length,
      0,
      'plain lock should have no sponsors'
    )
    assert.strictEqual(sponsorship.amounts.length, 0, 'plain lock should have no amounts')

    assert(typeof (await escrow.getSponsoredTotal(OCEAN)) === 'string')
    // A provider with nothing parked has nothing to reclaim.
    assert.strictEqual(await escrow.getReclaimable(payee, OCEAN), '0')
  })

  it('authorize stores a future expiryTimestamp (7th auth field)', async () => {
    const future = String(Math.floor(Date.now() / 1000) + 3600)
    const freshPayee = await (await provider.getSigner(8)).getAddress()
    await escrow.authorize(OCEAN, freshPayee, '20', '100', '3', future)
    const auths = await escrow.getAuthorizations(OCEAN, payer, freshPayee)
    assert(auths.length > 0, 'authorization not created')
    assert.strictEqual(
      auths[0][6].toString(),
      future,
      'expiryTimestamp not stored as the 7th field'
    )
  })

  it('re-authorize updates an existing authorization instead of no-opping', async () => {
    const p = await (await provider.getSigner(9)).getAddress()
    await escrow.authorize(OCEAN, p, '20', '100', '3')
    // Must NOT silently return null now; it should send a tx and overwrite the record.
    const receipt = await escrow.authorize(OCEAN, p, '30', '200', '4')
    assert(receipt, 're-authorize returned a falsy receipt (silent no-op)')
    const auths = await escrow.getAuthorizations(OCEAN, payer, p)
    assert(auths.length > 0, 'authorization missing after re-authorize')
    assert.strictEqual(
      auths[0][4].toString(),
      '4',
      'maxLockCounts not updated by re-authorize'
    )
  })

  it('createLock reverts once the authorization has expired', async () => {
    const expiredPayeeSigner = (await provider.getSigner(6)) as Signer
    const expiredPayee = await expiredPayeeSigner.getAddress()
    const escrowExpiredPayee = new EscrowContract(
      addresses.Escrow,
      expiredPayeeSigner,
      chainId
    )
    // A past expiryTimestamp is an immediate revoke: the auth exists but can't create locks.
    const past = String(Math.floor(Date.now() / 1000) - 10)
    await escrow.authorize(OCEAN, expiredPayee, '20', '100', '3', past)

    let reverted = false
    try {
      await escrowExpiredPayee.contract.createLock(
        nextJobId(),
        OCEAN,
        payer,
        '1000000000000000000',
        '50',
        '0',
        []
      )
    } catch {
      reverted = true
    }
    assert(reverted, 'createLock should revert against an expired authorization')
  })
})
