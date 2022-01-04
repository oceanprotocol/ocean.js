import { LoggerInstance } from '../utils'
import { Asset, DDO } from '../@types/'

export class Aquarius {
  public aquariusURL
  /**
   * Instantiate Aquarius
   * @param {String} aquariusURL
   */
  constructor(aquariusURL: string) {
    this.aquariusURL = aquariusURL
  }

  /** Resolves a DID
   * @param {string} did
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<DDO>} DDO
   */
  public async resolve(did: string, fetchMethod: any): Promise<DDO> {
    const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
    try {
      console.log(path)
      const response = await fetchMethod(path)
      if (response.ok) {
        const raw = await response.json()
        console.log(raw)
        return raw as DDO
      } else {
        throw new Error('HTTP request failed with status ' + response.status)
      }
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /**
   * Simple blocking sleep function
   */
  public sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  /**
   * Blocks until Aqua will cache the did (or the update for that did) or timeouts
   * @param  {string} did DID of the asset.
   * @param  {string} txid used when the did exists and we expect an update with that txid.
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<DDO>} DDO of the asset.
   */
  public async waitForAqua(fetchMethod: any, did: string, txid?: string): Promise<Asset> {
    let tries = 0
    do {
      try {
        const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
        const response = await fetchMethod(path)
        if (response.ok) {
          const ddo = await response.json()
          if (txid) {
            // check tx
            if (ddo.event && ddo.event.txid === txid) return ddo as Asset
          } else return ddo as Asset
        }
      } catch (e) {
        // do nothing
      }
      await this.sleep(1500)
      tries++
    } while (tries < 100)
    return null
  }
}

export default Aquarius
