import { LoggerInstance, sleep } from '../utils'
import { Asset, DDO, ValidateMetadata } from '../@types/'
import fetch from 'cross-fetch'
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
   * @param {AbortSignal} signal abort signal
   * @return {Promise<Asset>} Asset
   */
  public async resolve(did: string, signal?: AbortSignal): Promise<Asset> {
    const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: signal
      })

      if (response.ok) {
        const raw = await response.json()
        return raw as Asset
      } else {
        throw new Error('HTTP request failed with status ' + response.status)
      }
    } catch (e) {
      LoggerInstance.error(e)
      throw new Error('HTTP request failed')
    }
  }

  /**
   * Blocks until Aqua will cache the did (or the update for that did) or timeouts
   
   * @param {string} did DID of the asset.
   * @param {string} txid used when the did exists and we expect an update with that txid.
     * @param {AbortSignal} signal abort signal
   * @return {Promise<DDO>} DDO of the asset.
   */
  public async waitForAqua(
    did: string,
    txid?: string,
    signal?: AbortSignal
  ): Promise<Asset> {
    let tries = 0
    do {
      try {
        const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
        const response = await fetch(path, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: signal
        })
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
      await sleep(1500)
      tries++
    } while (tries < 100)
    return null
  }

  /**
   * Validate DDO content
   * @param {DDO} ddo DID Descriptor Object content.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ValidateMetadata>}.
   */
  public async validate(ddo: DDO, signal?: AbortSignal): Promise<ValidateMetadata> {
    const status: ValidateMetadata = {
      valid: false
    }
    let jsonResponse
    try {
      const path = this.aquariusURL + '/api/aquarius/assets/ddo/validate'

      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(ddo),
        headers: {
          'Content-Type': 'application/octet-stream'
        },
        signal: signal
      })

      jsonResponse = await response.json()
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
