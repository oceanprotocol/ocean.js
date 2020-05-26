import { URL } from 'whatwg-url'
import { DDO } from '../metadata/Metadata'
import DID from '../ocean/DID'
import { EditableMetaData } from '../metadata/MetadataInterfaces'
import { Logger } from '../utils'
import { WebServiceConnector } from '../ocean/utils/WebServiceConnector'

const apiPath = '/api/v1/aquarius/assets/ddo'

export interface QueryResult {
    results: DDO[]
    page: number
    totalPages: number
    totalResults: number
}

export interface SearchQuery {
    text?: string
    offset?: number
    page?: number
    query: { [property: string]: string | number | string[] | number[] }
    sort?: { [jsonPath: string]: number }
}

/**
 * Provides an interface with Aquarius.
 * Aquarius provides an off-chain database store for metadata about data assets.
 */
export class Aquarius {
    public fetch: WebServiceConnector
    private logger: Logger
    private aquariusUri: string

    private get url() {
        return this.aquariusUri
    }

    /**
     * Instantiate Aquarius (independently of Ocean) for off-chain interaction.
     * @param {String} aquariusUri
     * @param {Logger} logger
     */
    constructor(aquariusUri: string, logger: Logger) {
        this.fetch = new WebServiceConnector(logger)
        this.logger = logger
        this.aquariusUri = aquariusUri
    }

    public async getVersionInfo() {
        return (await this.fetch.get(this.url)).json()
    }

    public async getAccessUrl(accessToken: any, payload: any): Promise<string> {
        const accessUrl: string = await this.fetch
            .post(`${accessToken.service_endpoint}/${accessToken.resource_id}`, payload)
            .then((response: any): string => {
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
            .catch(error => {
                this.logger.error(
                    'Error fetching the data asset consumption url: ',
                    error
                )
                return null
            })

        return accessUrl
    }

    /**
     * Search over the DDOs using a query.
     * @param  {SearchQuery} query Query to filter the DDOs.
     * @return {Promise<QueryResult>}
     */
    public async queryMetadata(query: SearchQuery): Promise<QueryResult> {
        const result: QueryResult = await this.fetch
            .post(`${this.url}${apiPath}/query`, JSON.stringify(query))
            .then((response: any) => {
                if (response.ok) {
                    return response.json() as DDO[]
                }
                this.logger.error(
                    'queryMetadata failed:',
                    response.status,
                    response.statusText
                )
                return this.transformResult()
            })
            .then(results => {
                return this.transformResult(results)
            })
            .catch(error => {
                this.logger.error('Error fetching querying metadata: ', error)
                return this.transformResult()
            })

        return result
    }

    /**
     * Search over the DDOs using a query.
     * @param  {SearchQuery} query Query to filter the DDOs.
     * @return {Promise<QueryResult>}
     */
    public async queryMetadataByText(query: SearchQuery): Promise<QueryResult> {
        const fullUrl = new URL(`${this.url}${apiPath}/query`)
        fullUrl.searchParams.append('text', query.text)
        fullUrl.searchParams.append(
            'sort',
            decodeURIComponent(JSON.stringify(query.sort))
        )
        fullUrl.searchParams.append('offset', query.offset.toString())
        fullUrl.searchParams.append('page', query.page.toString())

        const result: QueryResult = await this.fetch
            .get(fullUrl)
            .then((response: any) => {
                if (response.ok) {
                    return response.json() as DDO[]
                }
                this.logger.log(
                    'queryMetadataByText failed:',
                    response.status,
                    response.statusText
                )
                return this.transformResult()
            })
            .then(results => {
                return this.transformResult(results)
            })
            .catch(error => {
                this.logger.error('Error fetching querying metadata by text: ', error)
                return this.transformResult()
            })

        return result
    }

    /**
     * Stores a DDO in Aquarius.
     * @param  {DDO} ddo DDO to be stored.
     * @return {Promise<DDO>} Final DDO.
     */
    public async storeDDO(ddo: DDO): Promise<DDO> {
        const fullUrl = `${this.url}${apiPath}`
        const result: DDO = await this.fetch
            .post(fullUrl, DDO.serialize(ddo))
            .then((response: any) => {
                if (response.ok) {
                    return response.json()
                }
                this.logger.error(
                    'storeDDO failed:',
                    response.status,
                    response.statusText,
                    ddo
                )
                return null as DDO
            })
            .then((response: DDO) => {
                return new DDO(response) as DDO
            })
            .catch(error => {
                this.logger.error('Error fetching querying metadata: ', error)
                return null as DDO
            })

        return result
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
            .then((response: any) => {
                if (response.ok) {
                    return response.json()
                }
                this.logger.log(
                    'retrieveDDO failed:',
                    response.status,
                    response.statusText,
                    did
                )
                return null as DDO
            })
            .then((response: DDO) => {
                return new DDO(response) as DDO
            })
            .catch(error => {
                this.logger.error('Error fetching querying metadata: ', error)
                return null as DDO
            })

        return result
    }

    public async retrieveDDOByUrl(metadataServiceEndpoint?: string) {
        return this.retrieveDDO(undefined, metadataServiceEndpoint)
    }

    /**
     * Transfer ownership of a DDO
     * @param  {DID | string} did DID of the asset to update.
     * @param  {String} newOwner New owner of the DDO
     * @param  {String} updated Updated field of the DDO
     * @param  {String} signature Signature using updated field to verify that the consumer has rights
     * @return {Promise<String>} Result.
     */
    public async transferOwnership(
        did: DID | string,
        newOwner: string,
        updated: string,
        signature: string
    ): Promise<string> {
        did = did && DID.parse(did)
        const fullUrl = `${this.url}${apiPath}/owner/update/${did.getDid()}`
        const result = await this.fetch
            .put(
                fullUrl,
                JSON.stringify({
                    signature: signature,
                    updated: updated,
                    newOwner: newOwner
                })
            )
            .then((response: any) => {
                if (response.ok) {
                    return response.text
                }
                this.logger.log(
                    'transferownership failed:',
                    response.status,
                    response.statusText
                )
                return null
            })

            .catch(error => {
                this.logger.error('Error transfering ownership metadata: ', error)
                return null
            })

        return result
    }

    /**
     * Update Compute Privacy
     * @param  {DID | string} did DID of the asset to update.
     * @param  {number } serviceIndex Service index
     * @param  {boolean} allowRawAlgorithm Allow Raw Algorithms
     * @param  {boolean} allowNetworkAccess Allow Raw Algorithms
     * @param  {String[]} trustedAlgorithms Allow Raw Algorithms
     * @param  {String} updated Updated field of the DDO
     * @param  {String} signature Signature using updated field to verify that the consumer has rights
     * @return {Promise<String>} Result.
     */
    public async updateComputePrivacy(
        did: DID | string,
        serviceIndex: number,
        allowRawAlgorithm: boolean,
        allowNetworkAccess: boolean,
        trustedAlgorithms: string[],
        updated: string,
        signature: string
    ): Promise<string> {
        did = did && DID.parse(did)
        const fullUrl = `${this.url}${apiPath}/computePrivacy/update/${did.getDid()}`
        const result = await this.fetch
            .put(
                fullUrl,
                JSON.stringify({
                    signature: signature,
                    updated: updated,
                    serviceIndex: serviceIndex,
                    allowRawAlgorithm: allowRawAlgorithm,
                    allowNetworkAccess: allowNetworkAccess,
                    trustedAlgorithms: trustedAlgorithms
                })
            )
            .then((response: any) => {
                if (response.ok) {
                    return response.text
                }
                this.logger.log(
                    'update compute privacy failed:',
                    response.status,
                    response.statusText
                )
                return null
            })

            .catch(error => {
                this.logger.error('Error updating compute privacy: ', error)
                return null
            })

        return result
    }

    /**
     * Edit Metadata for a DDO.
     * @param  {did} string DID.
     * @param  {newMetadata}  EditableMetaData Metadata fields & new values.
     * @param  {String} updated Updated field of the DDO
     * @param  {String} signature Signature using updated field to verify that the consumer has rights
     * @return {Promise<String>} Result.
     */
    public async editMetadata(
        did: DID | string,
        newMetadata: EditableMetaData,
        updated: string,
        signature: string
    ): Promise<string> {
        did = did && DID.parse(did)
        const fullUrl = `${this.url}${apiPath}/metadata/${did.getDid()}`
        const data = Object()
        if (newMetadata.description != null) data.description = newMetadata.description
        if (newMetadata.title != null) data.title = newMetadata.title
        if (newMetadata.servicePrices != null)
            data.servicePrices = newMetadata.servicePrices
        if (newMetadata.links != null) data.links = newMetadata.links
        data.updated = updated
        data.signature = signature
        const result = await this.fetch
            .put(fullUrl, JSON.stringify(data))
            .then((response: any) => {
                if (response.ok) {
                    return response.text
                }
                this.logger.log(
                    'editMetaData failed:',
                    response.status,
                    response.statusText
                )
                return null
            })

            .catch(error => {
                this.logger.error('Error transfering ownership metadata: ', error)
                return null
            })

        return result
    }

    /**
     * Retire a DDO (Delete)
     * @param  {DID | string} did DID of the asset to update.
     * @param  {String} updated Updated field of the DDO
     * @param  {String} signature Signature using updated field to verify that the consumer has rights
     * @return {Promise<String>} Result.
     */
    public async retire(
        did: DID | string,
        updated: string,
        signature: string
    ): Promise<string> {
        did = did && DID.parse(did)
        const fullUrl = `${this.url}${apiPath}/${did.getDid()}`
        const result = await this.fetch
            .delete(
                fullUrl,
                JSON.stringify({
                    signature: signature,
                    updated: updated
                })
            )
            .then((response: any) => {
                if (response.ok) {
                    return response.text
                }
                this.logger.log('retire failed:', response.status, response.statusText)
                return null
            })

            .catch(error => {
                this.logger.error('Error transfering ownership metadata: ', error)
                return null
            })

        return result
    }

    public getServiceEndpoint(did: DID) {
        return `${this.url}/api/v1/aquarius/assets/ddo/did:op:${did.getId()}`
    }

    private transformResult(
        { results, page, total_pages: totalPages, total_results: totalResults }: any = {
            result: [],
            page: 0,
            total_pages: 0, // eslint-disable-line @typescript-eslint/camelcase
            total_results: 0 // eslint-disable-line @typescript-eslint/camelcase
        }
    ): QueryResult {
        return {
            results: (results || []).map(ddo => new DDO(ddo as DDO)),
            page,
            totalPages,
            totalResults
        }
    }
}
