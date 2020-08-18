import Account from './Account'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * Account submodule of Ocean Protocol.
 */
export class Accounts extends Instantiable {
  /**
   * Returns the instance of OceanAccounts.
   * @return {Promise<OceanAccounts>}
   */
  public static async getInstance(config: InstantiableConfig): Promise<Accounts> {
    const instance = new Accounts()
    instance.setInstanceConfig(config)

    return instance
  }

  /**
   * Returns the list of accounts.
   * @return {Promise<Account[]>}
   */
  public async list(): Promise<Account[]> {
    // retrieve eth accounts
    const ethAccounts: string[] = await this.web3.eth.getAccounts()

    const accountPromises = ethAccounts.map(
      (address) => new Account(address, this.instanceConfig)
    )
    return Promise.all(accountPromises)
  }

  /**
   * Return account balance for a given ERC20 token
   * @param  {String}          TokenAddress .
   * @param  {Account}          account Account instance.
   * @return {Promise<String>}         Token balance.
   */
  public getTokenBalance(TokenAddress: string, account: Account): Promise<string> {
    return account.getTokenBalance(TokenAddress)
  }

  /**
   * Return account balance for a Ocean Tokens
   * @param  {Account}          account Account instance.
   * @return {Promise<String>}         Ocean Token balance.
   */
  public getOceanBalance(account: Account): Promise<string> {
    return account.getOceanBalance()
  }

  /**
   * Return account balance in ETH
   * @param  {Account}          account Account instance.
   * @return {Promise<String>}         Ether  balance.
   */
  public getEtherBalance(account: Account): Promise<string> {
    return account.getEtherBalance()
  }
}
