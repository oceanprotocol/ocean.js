import { Signer, TransactionRequest, getAddress, parseEther } from 'ethers'
import Escrow from '@oceanprotocol/contracts/artifacts/contracts/escrow/Escrow.sol/Escrow.json'
import {
  buildTxOverrides,
  buildUnsignedTx,
  sendPreparedTransaction
} from '../utils/ContractUtils'
import { AbiItem, ReceiptOrEstimate, ValidationResponse } from '../@types'
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
   * @return {Promise<[]>} Locks
   */
  public async getLocks(token: string, payer: string, payee: string): Promise<any[]> {
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
    const maxLockSecondsParsed = await this.amountToUnits(
      token,
      maxLockSeconds,
      tokenDecimals
    )
    const maxLockCountsParsed = await this.amountToUnits(
      token,
      maxLockCounts,
      tokenDecimals
    )
    return {
      tokenArg: token,
      payeeArg: payee,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed
    }
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
