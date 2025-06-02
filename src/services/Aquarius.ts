import fetch from 'cross-fetch'
import { LoggerInstance } from '../utils/Logger'
import { sleep } from '../utils/General.js'
import { Signer } from 'ethers'
import { signRequest } from '../utils/SignatureUtils.js'
import { Asset, DDO, DDOManager, ValidateMetadata } from '@oceanprotocol/ddo-js'

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
    interval: number = 30000,
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
          const ddoInstance = DDOManager.getDDOClass(ddo)
          const { indexedMetadata } = ddoInstance.getAssetFields()
          if (txid) {
            // check tx
            if (indexedMetadata.event && indexedMetadata.event.txid === txid)
              return ddo as Asset
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
   * @param {signer} ddo publisher account.
   * @param {providerUrl} provider url used to get the nonce.
   * @param {AbortSignal} signal abort signal
   * @return {Promise<ValidateMetadata>}.
   */
  public async validate(
    ddo: DDO,
    signer: Signer,
    providerUrl: string,
    signal?: AbortSignal
  ): Promise<ValidateMetadata> {
    const ddoValidateRoute = providerUrl + '/api/aquarius/assets/ddo/validate'
    const pathNonce = providerUrl + '/api/services/nonce'

    try {
      const publisherAddress = await signer.getAddress()
      // aquarius is always same url of other components with ocean nodes
      const responseNonce = await fetch(pathNonce + `?userAddress=${publisherAddress}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal
      })
      let { nonce } = await responseNonce.json()
      console.log(`[getNonce] Consumer: ${publisherAddress} nonce: ${nonce}`)
      if (!nonce || nonce === null) {
        nonce = '0'
      }
      const nextNonce = (Number(nonce) + 1).toString() // have to increase the previous
      // same signed message as usual (did + nonce)
      // the node will only validate (add his signature if there fields are present and are valid)
      // let signatureMessage = publisherAddress
      const signatureMessage = ddo.id + nextNonce
      const signature = await signRequest(signer, signatureMessage)
      const data = { ddo, publisherAddress, nonce: nextNonce, signature }
      const response = await fetch(ddoValidateRoute, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/octet-stream' },
        signal
      })
      const jsonResponse = await response.json()
      if (response.status !== 200) {
        throw new Error('Metadata validation failed')
      }
      console.log('Ddo successfully validated')

      return {
        valid: true,
        hash: jsonResponse.hash,
        proof: {
          validatorAddress: jsonResponse.publicKey,
          r: jsonResponse.r[0],
          s: jsonResponse.s[0],
          v: jsonResponse.v
        }
      }
    } catch (e) {
      LoggerInstance.error('Metadata validation failed', e.message)
    }
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
