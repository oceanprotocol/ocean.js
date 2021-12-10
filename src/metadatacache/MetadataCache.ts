import { DDO } from '../ddo/DDO'
import DID from '../ocean/DID'
import { Logger, isDdo } from '../utils'
import { WebServiceConnector } from '../ocean/utils/WebServiceConnector'
import { Response } from 'node-fetch'
import { Metadata, ValidateMetadata } from '../ddo/interfaces'
import { fetch as fetchLibrary } from 'cross-fetch'

const apiPath = '/api/v1/aquarius/assets/ddo'

export interface SearchQuery {
  from?: number
  size?: number
  query: {
    match?: {
      [property: string]:
        | string
        | number
        | boolean
        | Record<string, string | number | boolean>
    }
    // eslint-disable-next-line camelcase
    query_string?: {
      [property: string]: string | number | string[] | number[] | boolean
    }
    // eslint-disable-next-line camelcase
    simple_query_string?: {
      [property: string]: string | number | string[] | number[] | boolean
    }
  }
  sort?: { [jsonPath: string]: string }
}

/**
 * Provides an interface with Metadata Cache.
 * Metadata Cache provides an off-chain database cache for on-chain metadata about data assets.
 */
export class MetadataCache {
  public fetch: WebServiceConnector
  private logger: Logger
  private metadataCacheUri: string

  private get url() {
    return this.metadataCacheUri
  }

  /**
   * Instantiate Metadata Cache (independently of Ocean) for off-chain interaction.
   * @param {String} metadataCacheUri
   * @param {Logger} logger
   */
  constructor(metadataCacheUri: string, logger: Logger, requestTimeout?: number) {
    this.fetch = new WebServiceConnector(logger, requestTimeout)
    this.logger = logger
    this.metadataCacheUri = metadataCacheUri
  }

  public async getVersionInfo(): Promise<any> {
    return (await this.fetch.get(this.url)).json()
  }

  public async getAccessUrl(accessToken: any, payload: any): Promise<string> {
    const accessUrl: string = await this.fetch
      .post(`${accessToken.service_endpoint}/${accessToken.resource_id}`, payload)
      .then((response: Response) => {
        if (response.ok) {
          return response.text()
        }
        this.logger.error('Failed: ', response.status, response.statusText)
        return null
      })
      .then((consumptionUrl: string): string => {
        this.logger.error('Success accessing consume endpoint: ', consumptionUrl)
        return consumptionUrl
      })
      .catch((error) => {
        this.logger.error('Error fetching the data asset consumption url: ', error)
        return null
      })

    return accessUrl
  }

  /**
   * Search over the DDOs using a query.
   * @param  {SearchQuery} query Query to filter the DDOs.
   * @return {Promise<QueryResult>}
   */
  public async queryMetadata(query: SearchQuery): Promise<any> {
    const result = await this.fetch
      .post(`${this.url}/api/v1/aquarius/assets/query`, JSON.stringify(query))
      .then((response: Response) => {
        if (response.ok) {
          return response.json()
        }
        this.logger.error('queryMetadata failed:', response.status, response.statusText)
        return null
      })
      .then((results) => {
        return results
      })
      .catch((error) => {
        this.logger.error('Error fetching querying metadata: ', error)
        return null
      })

    return result
  }

  /**
   * Encrypts a DDO
   * @param  {any} ddo bytes to be encrypted.
   * @return {Promise<String>} Hex encoded encrypted DDO.
   */
  public async encryptDDO(ddo: any): Promise<any> {
    const fullUrl = `${this.url}/api/v1/aquarius/assets/ddo/encryptashex `
    const result = await this.fetch
      .postWithOctet(fullUrl, ddo)
      .then((response: Response) => {
        if (response.ok) {
          return response.text()
        }
        this.logger.error('encryptDDO failed:', response.status, response.statusText, ddo)
        return null
      })
      .catch((error) => {
        this.logger.error('Error encryptDDO: ', error)
        return null
      })

    return result
  }

  /**
   * Validate Metadata
   * @param  {Metadata} metadata  metadata to be validated. If it's a Metadata, it will be validated agains the local schema. Else, it's validated agains the remote schema
   * @return {Promise<Boolean|Object>}  Result.
   */

  public async validateMetadata(metadata: Metadata | DDO): Promise<ValidateMetadata> {
    const status: ValidateMetadata = {
      valid: false
    }
    const path = isDdo(metadata) ? '/validate-remote' : '/validate'
    try {
      const response = await this.fetch.post(
        `${this.url}${apiPath}${path}`,
        JSON.stringify(metadata)
      )
      if (response.ok) {
        const errors = await response.json()
        if (errors === true) status.valid = true
        else status.errors = errors
      } else {
        this.logger.error(
          'validate Metadata failed:',
          response.status,
          response.statusText
        )
      }
    } catch (error) {
      this.logger.error('Error validating metadata: ', error)
    }
    return status
  }

  /**
   * Retrieves a DDO by DID.
   * @param  {DID | string} did DID of the asset.
   * @return {Promise<DDO>} DDO of the asset.
   */
  public async retrieveDDO(
    did: DID | string,
    metadataServiceEndpoint?: string
  ): Promise<DDO> {
    did = did && DID.parse(did)
    const fullUrl = metadataServiceEndpoint || `${this.url}${apiPath}/${did.getDid()}`
    const result = await this.fetch
      .get(fullUrl)
      .then((response: Response) => {
        if (response.ok) {
          return response.json()
        }
        this.logger.log('retrieveDDO failed:', response.status, response.statusText, did)
        return null as DDO
      })
      .then((response: DDO) => {
        return new DDO(response) as DDO
      })
      .catch((error) => {
        this.logger.error('Error fetching querying metadata: ', error)
        return null as DDO
      })

    return result
  }

  public async retrieveDDOByUrl(metadataServiceEndpoint?: string): Promise<DDO> {
    return this.retrieveDDO(undefined, metadataServiceEndpoint)
  }

  public getServiceEndpoint(did: DID): string {
    return `${this.url}/api/v1/aquarius/assets/ddo/did:op:${did.getId()}`
  }

  public getURI(): string {
    return `${this.url}`
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
   * @return {Promise<DDO>} DDO of the asset.
   */
  public async waitForAqua(did: string, txid?: string) {
    const apiPath = '/api/v1/aquarius/assets/ddo'
    let tries = 0
    do {
      try {
        const result = await fetchLibrary(this.getURI() + apiPath + '/' + did)
        if (result.ok) {
          if (txid) {
            // check tx
            const ddo = await result.json()
            if (ddo.event && ddo.event.txid === txid) break
          } else break
        }
      } catch (e) {
        // do nothing
      }
      await this.sleep(1500)
      tries++
    } while (tries < 100)
  }
}
