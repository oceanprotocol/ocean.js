import { Signer, TransactionRequest, getAddress, parseEther } from 'ethers'
import Escrow from '@oceanprotocol/contracts/artifacts/contracts/escrow/Escrow.sol/Escrow.json'
import EscrowEnterpriseABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IEscrowEnterprise.sol/IEscrowEnterprise.json'
import {
  buildTxOverrides,
  buildUnsignedTx,
  getTokenDecimals,
  isUnsupportedInterfaceError,
  sendPreparedTransaction
} from '../utils/ContractUtils.js'
import {
  AbiItem,
  ReceiptOrEstimate,
  ValidationResponse,
  DepositData,
  PermitData,
  AuthData,
  LockData,
  EscrowKind,
  Sponsorship,
  IESCROW_CORE_INTERFACE_ID,
  IESCROW_LOCK_SUBSIDY_INTERFACE_ID,
  IESCROW_ENTERPRISE_INTERFACE_ID
} from '../@types/index.js'
import { Config } from '../config/index.js'
import { SmartContractWithAddress } from './SmartContractWithAddress.js'
import { Datatoken } from './Datatoken.js'
import BigNumber from 'bignumber.js'

export class EscrowContract extends SmartContractWithAddress {
  public abiEnterprise: AbiItem[]

  getDefaultAbi() {
    const abi = Escrow.abi as AbiItem[]
    // The community Escrow ABI already carries the full IEscrowCore / IEscrowLockSubsidy
    // surface, but not the enterprise-only read passthroughs (feeCollector / isTokenAllowed /
    // previewFee). Merge those so this wrapper can also talk to an EnterpriseEscrow address
    // (feature-detect with isEscrowEnterprise() first).
    const present = new Set(
      abi.filter((item) => item.type === 'function').map((item) => item.name)
    )
    const enterprise = (EscrowEnterpriseABI.abi as AbiItem[]).filter(
      (item) => item.type === 'function' && !present.has(item.name)
    )
    return enterprise.length ? [...abi, ...enterprise] : abi
  }

  /**
   * Instantiate AccessList class
   * @param {string} address The contract address.
   * @param {Signer} signer The signer object.
   * @param {string | number} [network] Network id or name
   * @param {Config} [config] The configuration object.
   * @param {AbiItem[]} [abi] ABI array of the smart contract
   */
  constructor(
    address: string,
    signer: Signer,
    network?: string | number,
    config?: Config,
    abi?: AbiItem[]
  ) {
    super(address, signer, network, config, abi)
    this.abi = abi || this.getDefaultAbi()
  }

  /**
   * Get Funds
   * @return {Promise<any>} Funds
   */
  public async getFunds(token: string): Promise<any> {
    return await this.contract.getFunds(token)
  }

  /**
   * Get User Funds — `{ available, locked }`.
   *
   * NOTE (Escrow v2): `locked` now tracks only the payer's **own** locked funds (the payer-funded
   * portion `P`), NOT the gross lock total. Any tokens a provider pre-funded (`S`) live in the
   * separate sponsored bucket (`getSponsoredTotal` / `getSponsorship`) and are no longer counted
   * here. If you previously assumed `locked == Σ getLocks().amount`, that is no longer true.
   * @return {Promise<any>} User funds
   */
  public async getUserFunds(payer: string, token: string): Promise<any> {
    return await this.contract.getUserFunds(payer, token)
  }

  /**
   * Get User Tokens
   * @return {Promise<any>} Array of tokens
   */
  public async getUserTokens(payer: string): Promise<any> {
    return await this.contract.getUserTokens(payer)
  }

  /**
   * Get Locks
   * @return {Promise<LockData[]>} Locks
   */
  public async getLocks(
    token: string,
    payer: string,
    payee: string
  ): Promise<LockData[]> {
    const locks: LockData[] = await this.contract.getLocks(token, payer, payee)
    return locks.map((lock) => ({
      jobId: lock.jobId.toString(),
      payer: lock.payer,
      amount: lock.amount.toString(),
      expiry: lock.expiry.toString(),
      token: lock.token,
      startTime: lock.startTime.toString()
    }))
  }

  /**
   * Get Authorizations. Each entry is an `auth` tuple; see {@link EscrowAuthorization} for the
   * field order.
   *
   * NOTE (Escrow v2): the tuple gained a 7th field `expiryTimestamp` (unix seconds; `0` =
   * indefinite) after which the payee can no longer create/extend locks — surface it in UIs and
   * for "revoke" (re-authorize with a past timestamp). Also, `currentLockedAmount` now reflects
   * only the payer-funded portion `P`.
   * @return {Promise<[]>} Authorizations (raw ethers tuples; index or field-name access)
   */
  public async getAuthorizations(
    token: string,
    payer: string,
    payee: string
  ): Promise<any[]> {
    return await this.contract.getAuthorizations(token, payer, payee)
  }

  /**
   * Checks funds for escrow payment.
   * Does authorization when needed.
   * Does deposit when needed.
   * @param {String} token as payment token for escrow
   * @param {String} consumerAddress as consumerAddress for that environment
   * @param {String} amountToDeposit wanted amount for escrow lock deposit. If this is
   * not provided and funds for escrow are 0 -> fallback to maxLockedAmount, else
   * use balance of payment token.
   * @param {String} maxLockedAmount amount necessary to be paid for starting compute job,
   * returned from initialize compute payment and used for authorize if needed.
   * @param {String} maxLockSeconds max seconds to lock the payment,
   * returned from initialize compute payment and used for authorize if needed.
   * @param {String} maxLockCounts max lock counts,
   * returned from initialize compute payment and used for authorize if needed.
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<ValidationResponse>} validation response
   */
  public async verifyFundsForEscrowPayment(
    token: string,
    consumerAddress: string,
    amountToDeposit?: string,
    maxLockedAmount?: string,
    maxLockSeconds?: string,
    maxLockCounts?: string,
    tokenDecimals?: number
  ): Promise<ValidationResponse> {
    const balanceNativeToken = await this.signer.provider?.getBalance(
      getAddress(consumerAddress)
    )
    if (new BigNumber(balanceNativeToken).isZero()) {
      return {
        isValid: false,
        message: 'Native token balance is 0. Please add funds'
      }
    }
    const tokenContract = new Datatoken(this.signer)
    const allowance = await tokenContract.allowance(
      token,
      await this.signer.getAddress(),
      this.contract.target.toString(),
      tokenDecimals
    )
    if (
      new BigNumber(await this.amountToUnits(token, allowance, 18)).isLessThan(
        new BigNumber(maxLockedAmount)
      )
    ) {
      await tokenContract.approve(
        getAddress(token),
        getAddress(this.contract.target.toString()),
        maxLockedAmount
      )
    }
    const balancePaymentToken = await tokenContract.balance(
      token,
      await this.signer.getAddress()
    )
    if (new BigNumber(balancePaymentToken).isZero()) {
      return {
        isValid: false,
        message: 'Payment token balance is 0. Please add funds'
      }
    }
    const auths = await this.getAuthorizations(
      token,
      await this.signer.getAddress(),
      consumerAddress
    )
    // An authorization is only usable here if its expiry (Escrow v2) covers the lock we are about
    // to enable: a lock may not outlive its auth, so an auth expiring before now + maxLockSeconds
    // would let createLock revert. Treat expiry 0 as indefinite; otherwise require it to reach the
    // full lock horizon. If it doesn't, we drop it and re-authorize below.
    const nowSeconds = Math.floor(Date.now() / 1000)
    const requiredExpiry = nowSeconds + (Number(maxLockSeconds) || 0)
    const activeAuths = auths.filter((auth: any) => {
      const expiry = Number(auth?.expiryTimestamp ?? auth?.[6] ?? 0)
      return expiry === 0 || expiry >= requiredExpiry
    })
    const funds = await this.getUserFunds(await this.signer.getAddress(), token)
    if (new BigNumber(funds[0]).isZero()) {
      if (
        amountToDeposit &&
        new BigNumber(parseEther(balancePaymentToken)).isLessThanOrEqualTo(
          new BigNumber(parseEther(amountToDeposit))
        ) &&
        new BigNumber(parseEther(amountToDeposit)).isGreaterThan(
          new BigNumber(maxLockedAmount)
        )
      ) {
        await this.deposit(token, amountToDeposit, tokenDecimals)
      } else if (
        new BigNumber(parseEther(balancePaymentToken)).isLessThanOrEqualTo(
          new BigNumber(parseEther(maxLockedAmount))
        )
      ) {
        await this.deposit(
          token,
          await this.unitsToAmount(token, maxLockedAmount, tokenDecimals),
          tokenDecimals
        )
      } else {
        await this.deposit(token, balancePaymentToken, tokenDecimals)
      }
    }
    if (activeAuths.length === 0) {
      await this.authorize(
        getAddress(token),
        getAddress(consumerAddress),
        (Number(maxLockedAmount) / 2).toString(),
        maxLockSeconds,
        maxLockCounts
      )
    }
    return {
      isValid: true,
      message: ''
    }
  }

  /**
   * Deposit funds
   * @param {String} token Token address
   * @param {String} amount amount
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async deposit<G extends boolean = false>(
    token: string,
    amount: string,
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.depositTx(token, amount, tokenDecimals)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async depositTx(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    const amountParsed = await this.amountToUnits(token, amount, tokenDecimals)
    const estGas = await this.contract.deposit.estimateGas(token, amountParsed)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.deposit, [token, amountParsed], overrides)
  }

  /**
   * Withdraw funds
   * @param {String[]} tokens Array of token addresses
   * @param {String[]} amounts Array of token amounts
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async withdraw<G extends boolean = false>(
    tokens: string[],
    amounts: string[],
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.withdrawTx(tokens, amounts, tokenDecimals)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async withdrawTx(
    tokens: string[],
    amounts: string[],
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    const { tokensWithSufficientFunds, amountsParsed } = await this.prepareWithdrawInputs(
      tokens,
      amounts,
      tokenDecimals
    )
    const estGas = await this.contract.withdraw.estimateGas(
      tokensWithSufficientFunds,
      amountsParsed
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.withdraw,
      [tokensWithSufficientFunds, amountsParsed],
      overrides
    )
  }

  private async prepareWithdrawInputs(
    tokens: string[],
    amounts: string[],
    tokenDecimals?: number
  ) {
    if (tokens.length !== amounts.length) {
      throw new Error('Tokens and amounts arrays must have the same length')
    }

    // Validate all requested withdrawals up front. We fail fast instead of silently
    // filtering entries to avoid unexpected partial withdrawals.
    const userAddress = await this.signer.getAddress()
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const amount = new BigNumber(amounts[i])
      const funds = await this.getUserFunds(userAddress, token)
      const available = new BigNumber(funds[0])

      if (!amount.isGreaterThan(0)) {
        throw new Error(
          `Invalid withdraw amount for token ${token}: requested ${amounts[i]}, expected > 0`
        )
      }
      if (amount.isGreaterThan(available)) {
        throw new Error(
          `Insufficient funds for token ${token}: requested ${
            amounts[i]
          }, available ${available.toString()}`
        )
      }
    }

    const tokensWithSufficientFunds = [...tokens]
    const amountsParsed = await Promise.all(
      amounts.map((amount, i) =>
        this.amountToUnits(tokensWithSufficientFunds[i], amount, tokenDecimals)
      )
    )

    return { tokensWithSufficientFunds, amountsParsed }
  }

  /**
   * Authorize a payee to create locks against the caller's escrow funds — or **update** an existing
   * authorization (change `maxLockedAmount`/`maxLockSeconds`/`maxLockCounts`/`expiryTimestamp`).
   *
   * Unlike the earlier behaviour, this no longer no-ops when an authorization already exists: the
   * call always goes through, so the on-chain record is created or overwritten. This is what makes
   * **renew / shorten / revoke** reachable from the SDK — to revoke, re-authorize with a past
   * `expiryTimestamp` (existing locks remain claimable/cancellable).
   * @param {String} token Token address
   * @param {String} payee,
   * @param {String} maxLockedAmount,
   * @param {String} maxLockSeconds,
   * @param {String} maxLockCounts,
   * @param {String} [expiryTimestamp='0'] unix ts (seconds) after which the payee can no longer
   * create/extend locks (Escrow v2). `'0'` = indefinite (today's behaviour). A past timestamp
   * revokes. Claim and cancel are never gated by it.
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async authorize<G extends boolean = false>(
    token: string,
    payee: string,
    maxLockedAmount: string,
    maxLockSeconds: string,
    maxLockCounts: string,
    expiryTimestamp: string = '0',
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.authorizeTx(
      token,
      payee,
      maxLockedAmount,
      maxLockSeconds,
      maxLockCounts,
      expiryTimestamp,
      tokenDecimals
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async authorizeTx(
    token: string,
    payee: string,
    maxLockedAmount: string,
    maxLockSeconds: string,
    maxLockCounts: string,
    expiryTimestamp: string = '0',
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    // Note: this intentionally does NOT early-return when an authorization already exists. The
    // contract's `authorize` overwrites the existing record, which is how renew/shorten/revoke
    // works; short-circuiting here would make those operations silently no-op.
    const {
      tokenArg,
      payeeArg,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed
    } = await this.prepareAuthorizeInputs(
      token,
      payee,
      maxLockedAmount,
      maxLockSeconds,
      maxLockCounts,
      tokenDecimals
    )
    const estGas = await this.contract.authorize.estimateGas(
      tokenArg,
      payeeArg,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed,
      expiryTimestamp
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.authorize,
      [
        tokenArg,
        payeeArg,
        maxLockedAmountParsed,
        maxLockSecondsParsed,
        maxLockCountsParsed,
        expiryTimestamp
      ],
      overrides
    )
  }

  private assertSingleTokenForDecimalsOverride(
    tokens: string[],
    tokenDecimals?: number
  ): void {
    if (tokenDecimals === undefined) return
    const uniqueTokens = new Set(tokens.map((token) => token.toLowerCase()))
    if (uniqueTokens.size > 1) {
      throw new Error(
        'tokenDecimals cannot be used when the batch contains multiple different tokens'
      )
    }
  }

  private async prepareAuthorizeInputs(
    token: string,
    payee: string,
    maxLockedAmount: string,
    maxLockSeconds: string,
    maxLockCounts: string,
    tokenDecimals?: number
  ) {
    const maxLockedAmountParsed = await this.amountToUnits(
      token,
      maxLockedAmount,
      tokenDecimals
    )
    const maxLockSecondsParsed = maxLockSeconds
    const maxLockCountsParsed = maxLockCounts
    return {
      tokenArg: token,
      payeeArg: payee,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed
    }
  }

  /**
   * Batch deposits, permits, and authorizations
   * @param {DepositData[]} deposits
   * @param {PermitData[]} permits
   * @param {AuthData[]} auths
   * @param {number} [tokenDecimals]
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async bundle<G extends boolean = false>(
    deposits: DepositData[],
    permits: PermitData[],
    auths: AuthData[],
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.bundleTx(deposits, permits, auths, tokenDecimals)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async bundleTx(
    deposits: DepositData[] = [],
    permits: PermitData[] = [],
    auths: AuthData[] = [],
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    this.assertSingleTokenForDecimalsOverride(
      [...deposits, ...permits, ...auths].map((item) => item.token),
      tokenDecimals
    )
    const depositsParsed = await this.mapDeposits(deposits || [], tokenDecimals)
    const permitsParsed = await this.mapPermits(permits || [], tokenDecimals)
    const authsParsed = await this.mapAuths(auths || [], tokenDecimals)

    const estGas = await this.contract.bundle.estimateGas(
      depositsParsed,
      permitsParsed,
      authsParsed
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.bundle,
      [depositsParsed, permitsParsed, authsParsed],
      overrides
    )
  }

  /**
   * Extend an existing lock by updating amount/expiry.
   * @param {string} jobId
   * @param {string} token
   * @param {string} payer
   * @param {string} amount gross lock amount `L` (payer + sponsored)
   * @param {string} expiry
   * @param {string | number} [jobType='0'] job type (Escrow v2); routes the sponsorship gates
   * @param {string[]} [subsidyProviders=[]] providers that may pre-fund the lock (Escrow v2);
   * `[]` = plain payer-funded (identical to the old behaviour). At most `maxSponsorsPerLock()`
   * (==10) unique providers; the payer covers whatever they don't.
   * @param {number} [tokenDecimals]
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async reLock<G extends boolean = false>(
    jobId: string,
    token: string,
    payer: string,
    amount: string,
    expiry: string,
    jobType: string | number = '0',
    subsidyProviders: string[] = [],
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.reLockTx(
      jobId,
      token,
      payer,
      amount,
      expiry,
      jobType,
      subsidyProviders,
      tokenDecimals
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async reLockTx(
    jobId: string,
    token: string,
    payer: string,
    amount: string,
    expiry: string,
    jobType: string | number = '0',
    subsidyProviders: string[] = [],
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    const amountParsed = await this.amountToUnits(token, amount, tokenDecimals)
    const args = [jobId, token, payer, amountParsed, expiry, jobType, subsidyProviders]
    const estGas = await this.contract.reLock.estimateGas(...args)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.reLock, args, overrides)
  }

  /**
   * Extend multiple existing locks by updating amount/expiry.
   * @param {string[]} jobIds
   * @param {string[]} tokens
   * @param {string[]} payers
   * @param {string[]} amounts
   * @param {string[]} expiries
   * @param {(string | number)[]} [jobTypes=[]] per-entry job types (Escrow v2); defaults to `0` per
   * job when omitted. A non-empty array must match the number of jobs.
   * @param {string[][]} [subsidyProvidersList=[]] per-entry provider lists (Escrow v2); defaults to
   * `[]` (plain payer-funded) per job when omitted. A non-empty array must match the number of jobs.
   * @param {number} [tokenDecimals]
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async reLocks<G extends boolean = false>(
    jobIds: string[],
    tokens: string[],
    payers: string[],
    amounts: string[],
    expiries: string[],
    jobTypes: (string | number)[] = [],
    subsidyProvidersList: string[][] = [],
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.reLocksTx(
      jobIds,
      tokens,
      payers,
      amounts,
      expiries,
      jobTypes,
      subsidyProvidersList,
      tokenDecimals
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async reLocksTx(
    jobIds: string[],
    tokens: string[],
    payers: string[],
    amounts: string[],
    expiries: string[],
    jobTypes: (string | number)[] = [],
    subsidyProvidersList: string[][] = [],
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    if (
      jobIds.length !== tokens.length ||
      jobIds.length !== payers.length ||
      jobIds.length !== amounts.length ||
      jobIds.length !== expiries.length
    ) {
      throw new Error('All reLocks input arrays must have the same length')
    }
    // jobTypes / subsidyProviders are optional per-entry (Escrow v2). Default each entry to
    // plain payer-funded (jobType 0, no providers) so callers can keep the old 5-array form.
    const jobTypesArg = this.fillPerEntry(jobTypes, jobIds.length, () => '0', 'jobTypes')
    const subsidyProvidersArg = this.fillPerEntry(
      subsidyProvidersList,
      jobIds.length,
      () => [],
      'subsidyProvidersList'
    )
    this.assertSingleTokenForDecimalsOverride(tokens, tokenDecimals)

    const amountsParsed = await Promise.all(
      amounts.map((amount, index) =>
        this.amountToUnits(tokens[index], amount, tokenDecimals)
      )
    )

    const args = [
      jobIds,
      tokens,
      payers,
      amountsParsed,
      expiries,
      jobTypesArg,
      subsidyProvidersArg
    ]
    const estGas = await this.contract.reLocks.estimateGas(...args)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.reLocks, args, overrides)
  }

  /**
   * Normalize a per-entry optional array to exactly `length` entries. An empty/omitted array is
   * padded with a FRESH `fallback` per entry (via the factory, so array fallbacks like `[]` are not
   * shared references). A non-empty array of the wrong length throws, naming the offending array —
   * a mismatch is a caller bug, not something to silently pad.
   */
  private fillPerEntry<T>(
    values: T[],
    length: number,
    factory: () => T,
    label: string
  ): T[] {
    if (!values || values.length === 0) {
      return Array.from({ length }, () => factory())
    }
    if (values.length !== length) {
      throw new Error(
        `${label} length (${values.length}) must match the number of jobs (${length})`
      )
    }
    return values
  }

  private async mapDeposits(
    deposits: DepositData[],
    tokenDecimals?: number
  ): Promise<{ token: string; amount: string }[]> {
    return Promise.all(
      deposits.map(async (deposit) => ({
        token: deposit.token,
        amount: await this.amountToUnits(deposit.token, deposit.amount, tokenDecimals)
      }))
    )
  }

  private async mapPermits(
    permits: PermitData[],
    tokenDecimals?: number
  ): Promise<
    {
      token: string
      amount: string
      deadline: string
      v: number
      r: string
      s: string
    }[]
  > {
    return Promise.all(
      permits.map(async (permit) => ({
        token: permit.token,
        amount: await this.amountToUnits(permit.token, permit.amount, tokenDecimals),
        deadline: permit.deadline,
        v: permit.v,
        r: permit.r,
        s: permit.s
      }))
    )
  }

  private async mapAuths(
    auths: AuthData[],
    tokenDecimals?: number
  ): Promise<
    {
      token: string
      payee: string
      maxLockedAmount: string
      maxLockSeconds: string
      maxLockCounts: string
      expiryTimestamp: string
    }[]
  > {
    return Promise.all(
      auths.map(async (auth) => ({
        token: auth.token,
        payee: auth.payee,
        maxLockedAmount: await this.amountToUnits(
          auth.token,
          auth.maxLockedAmount,
          tokenDecimals
        ),
        maxLockSeconds: auth.maxLockSeconds,
        maxLockCounts: auth.maxLockCounts,
        // Escrow v2 AuthData gained expiryTimestamp; default to indefinite (0) when omitted.
        expiryTimestamp: auth.expiryTimestamp ?? '0'
      }))
    )
  }

  /**
   * Cancel expired locks
   * @param {String[]} jobIds Job IDs with hash
   * @param {String[]} tokens Token addresses
   * @param {String[]} payers, Payer addresses for the compute job
   * @param {String[]} payees, Payee addresses for the compute job,
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async cancelExpiredLocks<G extends boolean = false>(
    jobIds: string[],
    tokens: string[],
    payers: string[],
    payees: string[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.cancelExpiredLocksTx(jobIds, tokens, payers, payees)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async cancelExpiredLocksTx(
    jobIds: string[],
    tokens: string[],
    payers: string[],
    payees: string[]
  ): Promise<TransactionRequest> {
    const estGas = await this.contract.cancelExpiredLocks.estimateGas(
      jobIds,
      tokens,
      payers,
      payees
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.cancelExpiredLocks,
      [jobIds, tokens, payers, payees],
      overrides
    )
  }

  /**
   * A provider pulls its failed-push sponsorship refunds (parked when a push-back failed, see
   * `SponsorRefunded` with `reclaimable=true`). Escrow v2 (`IEscrowLockSubsidy`).
   * @param {string} token Token address
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async sweepReclaimable<G extends boolean = false>(
    token: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.sweepReclaimableTx(token)
    if (estimateGas) return <ReceiptOrEstimate<G>>tx.gasLimit
    const trxReceipt = await sendPreparedTransaction(this.getSignerAccordingSdk(), tx)
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  public async sweepReclaimableTx(token: string): Promise<TransactionRequest> {
    const estGas = await this.contract.sweepReclaimable.estimateGas(token)
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(this.contract.sweepReclaimable, [token], overrides)
  }

  /**
   * Total tokens currently held in the non-withdrawable sponsored bucket (Escrow v2). This is the
   * aggregate of all providers' pre-funded contributions backing live locks for `token`.
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} sponsored total, in human-readable token units
   */
  public async getSponsoredTotal(token: string, tokenDecimals?: number): Promise<string> {
    const total = await this.contract.getSponsoredTotal(token)
    return await this.unitsToAmount(token, total.toString(), tokenDecimals)
  }

  /**
   * The amount a specific provider can `sweepReclaimable` for `token` (failed push-backs parked
   * for later pull). Escrow v2.
   * @param {string} provider Provider address
   * @param {string} token Token address
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} reclaimable amount, in human-readable token units
   */
  public async getReclaimable(
    provider: string,
    token: string,
    tokenDecimals?: number
  ): Promise<string> {
    const amount = await this.contract.getReclaimable(provider, token)
    return await this.unitsToAmount(token, amount.toString(), tokenDecimals)
  }

  /**
   * The per-lock sponsorship breakdown (Escrow v2): the total sponsored amount and each
   * contributing provider with its share.
   *
   * The on-chain getter is token-agnostic, so the lock's `token` is **required** here to convert
   * the amounts to the correct decimals (the caller already knows it from `getLocks`). It is not
   * sent on-chain. Omitting the token and guessing decimals would silently mis-scale amounts for
   * non-18-decimal tokens (e.g. USDC), so it is not allowed.
   * @param {string} payee Payee (node) address
   * @param {string} payer Payer address
   * @param {string} jobId Job id of the lock
   * @param {string} token The lock's token address (used only to resolve decimals)
   * @param {number} [tokenDecimals] optional number of decimals of the token (skips the on-chain
   * `decimals()` lookup)
   * @return {Promise<Sponsorship>} `{ total, providers[], amounts[] }`, amounts in token units
   */
  public async getSponsorship(
    payee: string,
    payer: string,
    jobId: string,
    token: string,
    tokenDecimals?: number
  ): Promise<Sponsorship> {
    if (!token) {
      throw new Error('getSponsorship requires the lock token to resolve decimals')
    }
    const result = await this.contract.getSponsorship(payee, payer, jobId)
    const total = result.total ?? result[0]
    const providers = result.providers ?? result[1]
    const amounts = result.amounts ?? result[2]
    const decimals = tokenDecimals ?? Number(await getTokenDecimals(this.signer, token))
    return {
      total: await this.unitsToAmount(token, total.toString(), decimals),
      providers: [...providers],
      amounts: await Promise.all(
        amounts.map((amount: bigint) =>
          this.unitsToAmount(token, amount.toString(), decimals)
        )
      )
    }
  }

  /**
   * The maximum number of unique providers that may sponsor a single lock (Escrow v2); passing
   * more to `createLock`/`reLock` reverts "Too many sponsors". Cap your provider list to this.
   * @return {Promise<number>} the cap (10 at v2)
   */
  public async maxSponsorsPerLock(): Promise<number> {
    return Number(await this.contract.maxSponsorsPerLock())
  }

  /**
   * The escrow flavour (Escrow v2): `COMMUNITY` (permissionless) or `ENTERPRISE` (fee-gated).
   * @return {Promise<EscrowKind>} the escrow kind
   */
  public async escrowKind(): Promise<EscrowKind> {
    const kind = Number(await this.contract.escrowKind())
    if (!(kind in EscrowKind)) {
      throw new Error(`Unknown escrowKind value from contract: ${kind}`)
    }
    return kind as EscrowKind
  }

  /**
   * The escrow contract version (Escrow v2 returns 2). Use it, with ERC-165 discovery, to tell a
   * v2 escrow apart from a legacy one.
   * @return {Promise<number>} the version
   */
  public async version(): Promise<number> {
    return Number(await this.contract.version())
  }

  /**
   * ERC-165 feature detection (Escrow v2). Treats a revert / missing method as `false` so it is
   * safe to call against a legacy escrow.
   * @param {string} interfaceId The 4-byte interface id
   * @return {Promise<boolean>} true if the interface is supported
   */
  public async supportsInterface(interfaceId: string): Promise<boolean> {
    try {
      return await this.contract.supportsInterface(interfaceId)
    } catch (error) {
      // A revert / empty data / missing method => the contract doesn't support it (legacy escrow).
      // Re-throw genuine network/RPC errors so a transient failure isn't misreported as "legacy".
      if (isUnsupportedInterfaceError(error)) return false
      throw error
    }
  }

  /**
   * Convenience check that the escrow implements `IEscrowCore` (the base escrow surface at v2
   * signatures). A `false` here means a legacy (pre-v2) escrow.
   * @return {Promise<boolean>} true if `IEscrowCore` is supported
   */
  public async isEscrowCore(): Promise<boolean> {
    return await this.supportsInterface(IESCROW_CORE_INTERFACE_ID)
  }

  /**
   * Convenience check that the escrow implements `IEscrowLockSubsidy` (lock-time / prefunded
   * sponsorship). Gate any sponsorship flow behind this.
   * @return {Promise<boolean>} true if `IEscrowLockSubsidy` is supported
   */
  public async isEscrowLockSubsidy(): Promise<boolean> {
    return await this.supportsInterface(IESCROW_LOCK_SUBSIDY_INTERFACE_ID)
  }

  /**
   * Convenience check that the escrow implements `IEscrowEnterprise` (the fee-gated flavour's read
   * passthroughs). The community escrow returns `false`.
   * @return {Promise<boolean>} true if `IEscrowEnterprise` is supported
   */
  public async isEscrowEnterprise(): Promise<boolean> {
    return await this.supportsInterface(IESCROW_ENTERPRISE_INTERFACE_ID)
  }

  /**
   * (EnterpriseEscrow only) The configured fee collector; `ZERO_ADDRESS` means no fee gate.
   * Feature-detect with {@link isEscrowEnterprise} first.
   * @return {Promise<string>} the fee collector address
   */
  public async feeCollector(): Promise<string> {
    return await this.contract.feeCollector()
  }

  /**
   * (EnterpriseEscrow only) Whether `token` passes the enterprise token gate (true if no
   * collector). A lock passes the gate iff `isTokenAllowed(token) && previewFee(token, amount) <
   * amount`; check both **before** a would-be reverting `createLock`.
   * @param {string} token Token address
   * @return {Promise<boolean>} true if the token is allowed
   */
  public async isTokenAllowed(token: string): Promise<boolean> {
    return await this.contract.isTokenAllowed(token)
  }

  /**
   * (EnterpriseEscrow only) The enterprise fee charged on `amount` (0 if no collector).
   * @param {string} token Token address
   * @param {string} amount gross lock amount, in human-readable token units
   * @param {number} [tokenDecimals] optional number of decimals of the token
   * @return {Promise<string>} the fee, in human-readable token units
   */
  public async previewFee(
    token: string,
    amount: string,
    tokenDecimals?: number
  ): Promise<string> {
    const amountParsed = await this.amountToUnits(token, amount, tokenDecimals)
    const fee = await this.contract.previewFee(token, amountParsed)
    return await this.unitsToAmount(token, fee.toString(), tokenDecimals)
  }
}
