import { LoggerInstance, crossFetchGeneric } from '../utils'
import { Asset, DDO, Metadata, ValidateMetadata } from '../@types/'
import { json } from 'stream/consumers'

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
  public async resolve(did: string, fetchMethod?: any): Promise<DDO> {
    const preferedFetch = fetchMethod || crossFetchGeneric
    const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
    try {
      const response = await preferedFetch('GET', path, null, {
        'Content-Type': 'application/json'
      })
      if (response.ok) {
        const raw = response.data ? response.data : await response.json()
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
   
   * @param {string} did DID of the asset.
   * @param {string} txid used when the did exists and we expect an update with that txid.
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<DDO>} DDO of the asset.
   */
  public async waitForAqua(
    did: string,
    txid?: string,
    fetchMethod?: any
  ): Promise<Asset> {
    let tries = 0
    do {
      try {
        const preferedFetch = fetchMethod || crossFetchGeneric
        const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
        const response = await preferedFetch('GET', path, null, {
          'Content-Type': 'application/json'
        })
        if (response.ok) {
          const ddo = response.data ? response.data : await response.json()
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

  /**
   * Validate DDO content
   * @param {DDO} ddo DID Descriptor Object content.
   * @param {string} fetchMethod fetch client instance
   * @return {Promise<ValidateMetadata>}.
   */
  public async validate(ddo: DDO, fetchMethod: any): Promise<ValidateMetadata> {
    const preferedFetch = fetchMethod || crossFetchGeneric
    const status: ValidateMetadata = {
      valid: false
    }
    let jsonResponse
    try {
      const path = this.aquariusURL + '/api/aquarius/assets/ddo/validate'
      const response = await preferedFetch('POST', path, JSON.stringify(ddo), {
        'Content-Type': 'application/octet-stream'
      })
      jsonResponse = response.data ? response.data : await response.json()
      if (response.status === 200) {
        status.valid = true
        status.hash = jsonResponse.hash
        status.proof = {
          validatorAddress: jsonResponse.publicKey,
          r: jsonResponse.r[0],
          s: jsonResponse.s[0],
          v: jsonResponse.v
        }
      } else {
        status.errors = jsonResponse
        LoggerInstance.error('validate Metadata failed:', response.status, status.errors)
      }
    } catch (error) {
      LoggerInstance.error('Error validating metadata: ', error)
    }
    return status
  }
}

export default Aquarius
