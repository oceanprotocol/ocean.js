import Balance from '../models/Balance'
import Account from './Account'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * Account submodule of Ocean Protocol.
 */
export class OceanAccounts extends Instantiable {
    /**
     * Returns the instance of OceanAccounts.
     * @return {Promise<OceanAccounts>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanAccounts> {
        const instance = new OceanAccounts()
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
            address => new Account(address, this.instanceConfig)
        )
        return Promise.all(accountPromises)
    }

    /**
     * Return account balance.
     * @param  {Account}          account Account instance.
     * @return {Promise<Balance>}         Ether and Ocean Token balance.
     */
    public balance(account: Account): Promise<Balance> {
        return account.getBalance()
    }

    /**
     * Request tokens for an account.
     * @param  {Account}          account Account instance.
     * @param  {number}           amount  Token amount.
     * @return {Promise<boolean>}         Success.
     */
    public async requestTokens(account: Account, amount: number): Promise<boolean> {
        try {
            await account.requestTokens(amount)
            return true
        } catch (e) {
            return false
        }
    }
}
