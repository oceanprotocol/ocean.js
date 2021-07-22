import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { AbiItem } from 'web3-utils/types'
import Decimal from 'decimal.js'
/**
 * Account information.
 */
export default class Account extends Instantiable {
  private password?: string

  private token?: string

  constructor(private id: string = '0x0', config?: InstantiableConfig) {
    super()
    if (config) {
      this.setInstanceConfig(config)
    }
  }

  public getId(): string {
    return this.id
  }

  public setId(id: string): void {
    this.id = id
  }

  /**
   * Set account password.
   * @param {string} password Password for account.
   */
  public setPassword(password: string): void {
    this.password = password
  }

  /**
   * Returns account password.
   * @return {string} Account password.
   */
  public getPassword(): string {
    return this.password
  }

  // TODO - Check with Samer if authentificate is still needed or we can use sign

  /**
     * Set account token.
     * @param {string} token Token for account.
     
    public setToken(token: string): void {
        this.token = token
    }
    */
  /**
     * Returns account token.
     * @return {Promise<string>} Account token.
     
    public async getToken(): Promise<string> {
        return this.token || this.ocean.auth.restore(this)
    }
    */

  /**
     * Returns if account token is stored.
     * @return {Promise<boolean>} Is stored.
     
    public isTokenStored(): Promise<boolean> {
        return this.ocean.auth.isStored(this)
    }
    */
  /**
     * Authenticate the account.
     
    public authenticate() {
        return this.ocean.auth.store(this)
    }
    */

  /**
   * Balance of Any Token (converted from wei).
   * @return {Promise<string>}
   */
  public async getTokenBalance(TokenAdress: string): Promise<string> {
    if (TokenAdress === null) return null
    const minABI = [
      {
        constant: true,
        inputs: [
          {
            name: '_owner',
            type: 'address'
          }
        ],
        name: 'balanceOf',
        outputs: [
          {
            name: 'balance',
            type: 'uint256'
          }
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ] as AbiItem[]

    let result = null
    const decimals = await this.getTokenDecimals(TokenAdress)
    try {
      const token = new this.web3.eth.Contract(minABI, TokenAdress, {
        from: this.id
      })
      const balance = await token.methods.balanceOf(this.id).call()
      result = new Decimal(balance).div(10 ** decimals).toString()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get the balance: ${e.message}`)
    }
    return result
  }

  /**
   * Decimals of Any Token
   * @return {Promise<number>}
   */
  public async getTokenDecimals(TokenAdress: string): Promise<number> {
    let decimals = 18
    if (TokenAdress === null) return decimals
    const minABI = [
      {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [{ name: '', type: 'uint8' }],
        type: 'function'
      }
    ] as AbiItem[]

    try {
      const token = new this.web3.eth.Contract(minABI, TokenAdress, {
        from: this.id
      })
      decimals = await token.methods.decimals().call()
    } catch (e) {
      this.logger.error(`ERROR: Failed to get decimals : ${e.message}`)
    }
    return decimals
  }

  /**
   * Balance of Ocean Token. (converted from wei).
   * @return {Promise<string>}
   */
  public async getOceanBalance(): Promise<string> {
    return this.getTokenBalance(this.config.oceanTokenAddress)
  }

  /**
   * Symbol of a Token
   * @return {Promise<string>}
   */
  public async getTokenSymbol(TokenAdress: string): Promise<string> {
    // TO DO
    return ''
  }

  /**
   * Balance of Ether.(converted from wei).
   * @return {Promise<string>}
   */
  public async getEtherBalance(): Promise<string> {
    const result = await this.web3.eth.getBalance(this.id, 'latest')
    return this.web3.utils.fromWei(result)
  }
}
