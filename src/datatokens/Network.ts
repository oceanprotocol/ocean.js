import { lookup } from '@ethereum-navigator/navigator'
import { Instantiable } from '../Instantiable.abstract'

export class Network extends Instantiable {
  /**
   * Returns network id.
   * @return {Promise<number>} Network ID.
   */
  public getNetworkId(): Promise<number> {
    return this.web3.eth.net.getId()
  }

  /**
   * Returns the network by name.
   * @return {Promise<string>} Network name.
   */
  public async getNetworkName(): Promise<string> {
    return this.web3.eth.net.getId().then((networkId: number) => {
      const network = lookup(networkId)
      return network && network.name ? network.name : 'Development'
    })
  }
}
