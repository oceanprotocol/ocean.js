import fetch from 'cross-fetch'
import { LoggerInstance } from '../utils/Logger'
import { Asset, DDO, ValidateMetadata } from '../@types'
import { sleep } from '../utils/General'
import { Signer } from 'ethers'
import { signRequest } from '../utils/SignatureUtils'

export interface SearchQuery {
  from?: number
  size?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any
  sort?: { [jsonPath: string]: string }
  aggs?: any
}

export class Aquarius {
  public aquariusURL: string

  /**
   * Instantiate Aquarius
   * @param {String} aquariusURL
   */
  constructor(aquariusURL: string) {
    this.aquariusURL = aquariusURL
  }

  /** Resolves a DID
   * @param {string} did DID of the asset.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<Asset>} Asset
   */
  public async resolve(did: string, signal?: AbortSignal): Promise<Asset> {
    const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal
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
   * Blocks until Indexer will cache the did (or the update for that did) or timeouts
   * @param {string} did DID of the asset.
   * @param {string} txid used when the did exists and we expect an update with that txid.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<Asset>} DDO of the asset.
   */
  public async waitForIndexer(
    did: string,
    txid?: string,
    signal?: AbortSignal,
    interval: number = 3000,
    maxRetries: number = 100
  ): Promise<Asset> {
    let tries = 0
    // lets have a cap to prevent possible abuse as well
    if (maxRetries > 500) {
      LoggerInstance.warn('Max Limit exceeded, defaulting to 500 retries.')
      maxRetries = 500
    }
    do {
      try {
        const path = this.aquariusURL + '/api/aquarius/assets/ddo/' + did
        const response = await fetch(path, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal
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
      await sleep(interval)
      tries++
    } while (tries < maxRetries)
    return null
  }

  /**
   * Validate DDO content
   * @param {DDO} ddo DID Descriptor Object content.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ValidateMetadata>}.
   */
  public async validate(
    ddo: DDO,
    signer?: Signer,
    providerUrl?: string,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    const status: ValidateMetadata = {
      valid: false
    }
    let jsonResponse
    let response

    const path = this.aquariusURL + '/api/aquarius/assets/ddo/validate'

    try {
      console.log('path: ', path)
      // Old aquarius API and node API (before publisherAddress, nonce and signature verification)
      const validateRequestLegacy = async function (): Promise<Response> {
        response = await fetch(path, {
          method: 'POST',
          body: JSON.stringify(ddo),
          headers: { 'Content-Type': 'application/octet-stream' },
          signal
        })
        return response
      }

      if (signer && providerUrl) {
        const publisherAddress = await signer.getAddress()
        // aquarius is always same url of other components with ocean nodes
        const pathNonce = providerUrl + '/api/services/nonce'
        console.log('pathnonce', pathNonce)
        const responseNonce = await fetch(
          pathNonce + `?userAddress=${publisherAddress}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal
          }
        )
        console.log('response: ', responseNonce)
        let { nonce } = await responseNonce.json()
        console.log(`[getNonce] Consumer: ${publisherAddress} nonce: ${nonce}`)
        if (!nonce || nonce === null) {
          nonce = '0'
        }
        const newNonce = (Number(nonce) + 1).toString() // have to increase the previous
        console.log('nonce: ' + nonce + ' newNonce ' + newNonce)
        // same signed message as usual (did + nonce)
        // the node will only validate (add his signature if there fields are present and are valid)
        let signatureMessage = publisherAddress
        signatureMessage += ddo.id + newNonce
        const signature = await signRequest(signer, signatureMessage)
        const data = { ddo, publisherAddress, newNonce, signature }

        try {
          response = await fetch(path, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: { 'Content-Type': 'application/octet-stream' },
            signal
          })
        } catch (e) {
          // retry with legacy path validation
          LoggerInstance.error(
            'Metadata validation failed using publisher signature validation (perhaps not supported or legacy Aquarius), retrying with legacy path...',
            response.status,
            e.message
          )
          response = await validateRequestLegacy()
        }
      } else {
        // backwards compatibility, "old" way without signature stuff
        // this will not validate on newer versions of Ocean Node (status:400), as the node will not add the validation signature
        response = await validateRequestLegacy()
      }
      if (response.status === 200) {
        jsonResponse = await response.json()
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

  /**
   * Search over the DDOs using a query.
   * @param {string} did DID of the asset
   * @param {AbortSignal} signal abort signal
   * @return {Promise<QueryResult>}
   */
  public async getAssetMetadata(did: string, signal?: AbortSignal): Promise<any> {
    const path = this.aquariusURL + '/api/aquarius/assets/metadata/' + did

    try {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal
      })

      if (response.ok) {
        return response.json()
      } else {
        throw new Error(
          'getAssetMetadata failed: ' + response.status + response.statusText
        )
      }
    } catch (error) {
      LoggerInstance.error('Error getting metadata: ', error)
      throw new Error('Error getting metadata: ' + error)
    }
  }

  /**
   * Search over the DDOs using a query.
   * @param  {SearchQuery} query Query to filter the DDOs.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<QueryResult>}
   */
  public async querySearch(query: SearchQuery, signal?: AbortSignal): Promise<any> {
    const path = this.aquariusURL + '/api/aquarius/assets/query'

    try {
      const response = await fetch(path, {
        method: 'POST',
        body: JSON.stringify(query),
        headers: {
          'Content-Type': 'application/json'
        },
        signal
      })

      if (response.ok) {
        return response.json()
      } else {
        throw new Error('querySearch failed: ' + response.status + response.statusText)
      }
    } catch (error) {
      LoggerInstance.error('Error querying metadata: ', error)
      throw new Error('Error querying metadata: ' + error)
    }
  }
}
