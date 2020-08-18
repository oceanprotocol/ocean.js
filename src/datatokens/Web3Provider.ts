import Web3 from 'web3'
import Config from '../models/Config'

export default class Web3Provider {
  /**
   * Returns Web3 instance.
   * @return {Web3}
   */
  public static getWeb3(config: Partial<Config> = {}): Web3 {
    return new Web3(
      config.web3Provider ||
        Web3.givenProvider ||
        new Web3.providers.HttpProvider(config.nodeUri)
    )
  }
}
