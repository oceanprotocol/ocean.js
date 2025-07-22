import { Signer, getAddress, parseEther } from 'ethers';
import Escrow from '@oceanprotocol/contracts/artifacts/contracts/escrow/Escrow.sol/Escrow.json';
import { amountToUnits, sendTx } from '../utils/ContractUtils';
import { AbiItem, ReceiptOrEstimate, ValidationResponse } from '../@types';
import { Config } from '../config';
import { SmartContractWithAddress } from './SmartContractWithAddress';
import { Datatoken } from './Datatoken';
import BigNumber from 'bignumber.js';

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
   * @param {AbiItem[]} abiEnterprise Enterprise ABI array of the smart contract
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
   * @return {Promise<ValidationResponse>} validation response
   */
  public async verifyFundsForEscrowPayment(
    token: string,
    consumerAddress: string,
    amountToDeposit?: string,
    maxLockedAmount?: string,
    maxLockSeconds?: string,
    maxLockCounts?: string
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
      this.contract.target.toString()
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
        await this.deposit(token, amountToDeposit)
      } else if (
        new BigNumber(parseEther(balancePaymentToken)).isLessThanOrEqualTo(
          new BigNumber(parseEther(maxLockedAmount))
        )
      ) {
        await this.deposit(token, await this.unitsToAmount(token, maxLockedAmount))
      } else {
        await this.deposit(token, balancePaymentToken)
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
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async deposit<G extends boolean = false>(
    token: string,
    amount: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const amountParsed = amountToUnits(null, null, amount, 18)
    const estGas = await this.contract.deposit.estimateGas(token, amountParsed)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.deposit,
      token,
      amountParsed
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Withdraw funds
   * @param {String[]} tokens Array of token addresses
   * @param {String[]} amounts Array of token amounts
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async withdraw<G extends boolean = false>(
    tokens: string[],
    amounts: string[],
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    // check if funds exist in escrow in order to be withdrawed
    const tokensWithSufficientFunds = []
    const amountsWithSufficientFunds = []

    if (tokens.length !== amounts.length) {
      throw new Error('Tokens and amounts arrays must have the same length')
    }

    const userAddress = await this.signer.getAddress()

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const amount = new BigNumber(amounts[i])

      const funds = await this.getUserFunds(userAddress, token)
      const available = new BigNumber(funds[0])

      if (amount.isGreaterThan(0) && amount.isLessThanOrEqualTo(available)) {
        tokensWithSufficientFunds.push(token)
        amountsWithSufficientFunds.push(amounts[i])
      } else {
        console.log(`Insufficient funds for token ${token}`)
      }
    }
    const amountsParsed = amountsWithSufficientFunds.map((amount) =>
      amountToUnits(null, null, amount, 18)
    )

    const estGas = await this.contract.withdraw.estimateGas(tokens, amountsParsed)
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas

    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.withdraw,
      tokensWithSufficientFunds,
      amountsParsed
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Authorize locks
   * @param {String} token Token address
   * @param {String} payee,
   * @param {String} maxLockedAmount,
   * @param {String} maxLockSeconds,
   * @param {String} maxLockCounts,
   * @param {Boolean} estimateGas if True, return gas estimate
   * @return {Promise<ReceiptOrEstimate>} returns the transaction receipt or the estimateGas value
   */
  public async authorize<G extends boolean = false>(
    token: string,
    payee: string,
    maxLockedAmount: string,
    maxLockSeconds: string,
    maxLockCounts: string,
    estimateGas?: G
  ): Promise<ReceiptOrEstimate<G>> {
    const auths = await this.getAuthorizations(
      token,
      await this.signer.getAddress(),
      payee
    )
    if (auths.length !== 0) {
      console.log(`Payee ${payee} already authorized`)
      return null
    }
    const maxLockedAmountParsed = amountToUnits(null, null, maxLockedAmount, 18)
    const maxLockSecondsParsed = amountToUnits(null, null, maxLockSeconds, 18)
    const maxLockCountsParsed = amountToUnits(null, null, maxLockCounts, 18)
    const estGas = await this.contract.authorize.estimateGas(
      token,
      payee,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.authorize,
      token,
      payee,
      maxLockedAmountParsed,
      maxLockSecondsParsed,
      maxLockCountsParsed
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }

  /**
   * Cancel expired locks
   * @param {String} jobId Job ID with hash
   * @param {String} token Token address
   * @param {String} payee, Payee address for the compute job,
   * @param {String} payer, Payer address for the compute job
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
    const estGas = await this.contract.cancelExpiredLocks.estimateGas(
      jobIds,
      tokens,
      payers,
      payees
    )
    if (estimateGas) return <ReceiptOrEstimate<G>>estGas
    const trxReceipt = await sendTx(
      estGas,
      this.getSignerAccordingSdk(),
      this.config?.gasFeeMultiplier,
      this.contract.cancelExpiredLocks,
      jobIds,
      tokens,
      payers,
      payees
    )
    return <ReceiptOrEstimate<G>>trxReceipt
  }
}
