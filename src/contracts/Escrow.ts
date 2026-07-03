import { Signer, TransactionRequest, getAddress, parseEther } from 'ethers'
import Escrow from '@oceanprotocol/contracts/artifacts/contracts/escrow/Escrow.sol/Escrow.json'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils'
import {
  AbiItem,
  ReceiptOrEstimate,
  ValidationResponse,
  DepositData,
  PermitData,
  AuthData,
  LockData
} from '../@types'
import { Config } from '../config'
import { SmartContractWithAddress } from './SmartContractWithAddress'
import { Datatoken } from './Datatoken'
import BigNumber from 'bignumber.js'

export class EscrowContract extends SmartContractWithAddress {
  public abiEnterprise: AbiItem[]

  getDefaultAbi() {
    return Escrow.abi as AbiItem[]
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
   * Get User Funds
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
    return await this.contract.getLocks(token, payer, payee)
  }

  /**
   * Get Authorizations
   * @return {Promise<[]>} Authorizations
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
    if (auths.length === 0) {
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
   * Authorize locks
   * @param {String} token Token address
   * @param {String} payee,
   * @param {String} maxLockedAmount,
   * @param {String} maxLockSeconds,
   * @param {String} maxLockCounts,
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
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.authorizeTx(
      token,
      payee,
      maxLockedAmount,
      maxLockSeconds,
      maxLockCounts,
      tokenDecimals
    )
    if (!tx) {
      return <ReceiptOrEstimate<G>>null
    }
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
    tokenDecimals?: number
  ): Promise<TransactionRequest | null> {
    const auths = await this.getAuthorizations(
      token,
      await this.signer.getAddress(),
      payee
    )
    if (auths.length !== 0) {
      console.log(`Payee ${payee} already authorized`)
      return null
    }
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
      maxLockCountsParsed
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
        maxLockCountsParsed
      ],
      overrides
    )
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
   * @param {string} amount
   * @param {string} expiry
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
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.reLockTx(jobId, token, payer, amount, expiry, tokenDecimals)
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
    tokenDecimals?: number
  ): Promise<TransactionRequest> {
    const amountParsed = await this.amountToUnits(token, amount, tokenDecimals)
    const estGas = await this.contract.reLock.estimateGas(
      jobId,
      token,
      payer,
      amountParsed,
      expiry
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.reLock,
      [jobId, token, payer, amountParsed, expiry],
      overrides
    )
  }

  /**
   * Extend multiple existing locks by updating amount/expiry.
   * @param {string[]} jobIds
   * @param {string[]} tokens
   * @param {string[]} payers
   * @param {string[]} amounts
   * @param {string[]} expiries
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
    tokenDecimals?: number,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const tx = await this.reLocksTx(
      jobIds,
      tokens,
      payers,
      amounts,
      expiries,
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

    const amountsParsed = await Promise.all(
      amounts.map((amount, index) =>
        this.amountToUnits(tokens[index], amount, tokenDecimals)
      )
    )

    const estGas = await this.contract.reLocks.estimateGas(
      jobIds,
      tokens,
      payers,
      amountsParsed,
      expiries
    )
    const overrides = await buildTxOverrides(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier
    )
    return buildUnsignedTx(
      this.contract.reLocks,
      [jobIds, tokens, payers, amountsParsed, expiries],
      overrides
    )
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
        maxLockCounts: auth.maxLockCounts
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
}
