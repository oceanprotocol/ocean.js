import Account from './Account'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * Tokens submodule of Ocean Protocol.
 */
export class OceanTokens extends Instantiable {
    /**
     * Returns the instance of OceanTokens.
     * @return {Promise<OceanTokens>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanTokens> {
        const instance = new OceanTokens()
        instance.setInstanceConfig(config)

        return instance
    }

    /**
     * Transfer a number of tokens to the mentioned account.
     * @param  {string}           to     Address that receives the tokens.
     * @param  {number}           amount Tokens to transfer.
     * @param  {Account}          from   Sender account address.
     * @return {Promise<boolean>}        Success,
     */
    public async transfer(to: string, amount: number, from: Account): Promise<boolean> {
        this.ocean.keeper.token.transfer(to, amount, from.getId())
        return true
    }

    /**
     * Request tokens for an account.
     * @param  {Account}          account Account instance.
     * @param  {number}           amount  Token amount.
     * @return {Promise<boolean>}         Success.
     */
    public async request(account: Account, amount: number): Promise<boolean> {
        try {
            await account.requestTokens(amount)
            return true
        } catch (e) {
            return false
        }
    }
}
