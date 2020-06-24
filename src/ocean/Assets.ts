import { SearchQuery, QueryResult } from '../aquarius/Aquarius'
import { DDO } from '../ddo/DDO'
import { Metadata } from '../ddo/interfaces/Metadata'
import { Service, ServiceAccess, ServiceComputePrivacy } from '../ddo/interfaces/Service'
import { EditableMetadata } from '../ddo/interfaces/EditableMetadata'
import Account from './Account'
import DID from './DID'
import { SubscribablePromise } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { WebServiceConnector } from './utils/WebServiceConnector'

export enum CreateProgressStep {
    CreatingDataToken,
    DataTokenCreated,
    EncryptingFiles,
    FilesEncrypted,
    GeneratingProof,
    ProofGenerated,
    StoringDdo,
    DdoStored
}

export enum OrderProgressStep {
    CreatingAgreement,
    AgreementInitialized,
    LockingPayment,
    LockedPayment
}

/**
 * Assets submodule of Ocean Protocol.
 */
export class Assets extends Instantiable {
    /**
     * Returns the instance of Assets.
     * @return {Promise<Assets>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<Assets> {
        const instance = new Assets()
        instance.setInstanceConfig(config)

        return instance
    }

    /**
     * Creates a simple asset and a datatoken
     * @param  {Account}  publisher Publisher account.
     * @return {Promise<String>}
     */
    public createSimpleAsset(publisher: Account): Promise<string> {
        const publisherURI = this.ocean.brizo.getURI()
        const jsonBlob = { t: 0, url: publisherURI }
        const { datatokens } = this.ocean
        return datatokens.create(JSON.stringify(jsonBlob), publisher)
    }

    /**
     * Creates a new DDO and publishes it
     * @param  {Metadata} metadata DDO metadata.
     * @param  {Account}  publisher Publisher account.
     * @param  {list} services list of Service description documents
     * @return {Promise<DDO>}
     */
    public create(
        metadata: Metadata,
        publisher: Account,
        services: Service[] = [],
        dtAddress?: string
    ): SubscribablePromise<CreateProgressStep, DDO> {
        this.logger.log('Creating asset')
        return new SubscribablePromise(async (observer) => {
            if (services.length === 0) {
                this.logger.log('You have no services. Are you sure about this?')
            }
            if (!dtAddress) {
                this.logger.log('Creating datatoken')
                observer.next(CreateProgressStep.CreatingDataToken)
                const metadataStoreURI = this.ocean.aquarius.getURI()
                const jsonBlob = { t: 1, url: metadataStoreURI }
                const { datatokens } = this.ocean
                dtAddress = await datatokens.create(JSON.stringify(jsonBlob), publisher)
                this.logger.log('DataToken creted')
                observer.next(CreateProgressStep.DataTokenCreated)
            }

            const did: DID = DID.generate()

            this.logger.log('Encrypting files')
            observer.next(CreateProgressStep.EncryptingFiles)
            const encryptedFiles = await this.ocean.brizo.encrypt(
                did.getId(),
                metadata.main.files,
                publisher,
                dtAddress
            )
            this.logger.log('Files encrypted')
            observer.next(CreateProgressStep.FilesEncrypted)

            let indexCount = 0
            // create ddo itself
            const ddo: DDO = new DDO({
                id: did.getDid(),
                dtAddress: dtAddress,
                authentication: [
                    {
                        type: 'RsaSignatureAuthentication2018',
                        publicKey: did.getDid()
                    }
                ],
                publicKey: [
                    {
                        id: did.getDid(),
                        type: 'EthereumECDSAKey',
                        owner: publisher.getId()
                    }
                ],
                service: [
                    {
                        type: 'metadata',
                        attributes: {
                            // Default values
                            curation: {
                                rating: 0,
                                numVotes: 0
                            },
                            // Overwrites defaults
                            ...metadata,
                            encryptedFiles,
                            // Cleaning not needed information
                            main: {
                                ...metadata.main,
                                files: metadata.main.files.map((file, index) => ({
                                    ...file,
                                    index,
                                    url: undefined
                                }))
                            } as any
                        }
                    },
                    ...services
                ]
                    // Remove duplications
                    .reverse()
                    .filter(
                        ({ type }, i, list) =>
                            list.findIndex(({ type: t }) => t === type) === i
                    )
                    .reverse()
                    // Adding index
                    .map((_) => ({
                        ..._,
                        index: indexCount++
                    })) as Service[]
            })

            this.logger.log('Generating proof')
            observer.next(CreateProgressStep.GeneratingProof)
            await ddo.addProof(this.ocean, publisher.getId(), publisher.getPassword())
            this.logger.log('Proof generated')
            observer.next(CreateProgressStep.ProofGenerated)
            this.logger.log('Storing DDO')
            observer.next(CreateProgressStep.StoringDdo)
            const storedDdo = await this.ocean.aquarius.storeDDO(ddo)
            this.logger.log('DDO stored')
            observer.next(CreateProgressStep.DdoStored)
            return storedDdo
        })
    }

    /**
     * Returns the owner of an asset.
     * @param  {string} did Decentralized ID.
     * @return {Promise<string>} Returns Account ID
     */
    public async owner(did: string): Promise<string> {
        // TODO:
        // const owner = await this.ocean.keeper.didRegistry.getDIDOwner(did)
        // return owner
        return ''
    }

    /**
     * Returns the assets of a owner.
     * @param  {string} owner Owner address.
     * @return {Promise<string[]>} List of DIDs.
     */
    public async ownerAssets(owner: string): Promise<string[]> {
        // TODO:
        // return this.ocean.keeper.didRegistry.getAttributesByOwner(owner)
        return ['']
    }

    /**
     * Returns a DDO by DID.
     * @param  {string} did Decentralized ID.
     * @return {Promise<DDO>}
     */
    public async resolve(did: string): Promise<DDO> {
        return this.ocean.aquarius.retrieveDDO(did)
    }

    public async resolveByDTAddress(
        dtAddress: string,
        offset?: number,
        page?: number,
        sort?: number
    ): Promise<DDO[]> {
        const query = { "query": {"dtAddress": [dtAddress]}}
        const searchQuery = {
            offset: offset || 100,
            page: page || 1,
            query: {
                value: query
            },
            sort: {
                value: sort || 1
            },
            text: dtAddress
        } as SearchQuery
        return (await this.ocean.aquarius.queryMetadata(searchQuery)).results
    }

    /**
     * Edit Metadata for a DDO.
     * @param  {did} string DID.
     * @param  {newMetadata}  EditableMetadata Metadata fields & new values.
     * @param  {Account} account Ethereum account of owner to sign and prove the ownership.
     * @return {Promise<string>}
     */
    public async editMetadata(
        did: string,
        newMetadata: EditableMetadata,
        account: Account
    ): Promise<string> {
        const oldDdo = await this.ocean.aquarius.retrieveDDO(did)
        // get a signature
        const signature = await this.ocean.utils.signature.signForAquarius(
            oldDdo.updated,
            account
        )
        let result = null
        if (signature != null)
            result = await this.ocean.aquarius.editMetadata(
                did,
                newMetadata,
                oldDdo.updated,
                signature
            )

        return result
    }

    /**
     * Update Compute Privacy
     * @param  {did} string DID.
     * @param  {number} serviceIndex Index of the compute service in the DDO
     * @param  {ServiceComputePrivacy} computePrivacy ComputePrivacy fields & new values.
     * @param  {Account} account Ethereum account of owner to sign and prove the ownership.
     * @return {Promise<string>}
     */
    public async updateComputePrivacy(
        did: string,
        serviceIndex: number,
        computePrivacy: ServiceComputePrivacy,
        account: Account
    ): Promise<string> {
        const oldDdo = await this.ocean.aquarius.retrieveDDO(did)
        // get a signature
        const signature = await this.ocean.utils.signature.signForAquarius(
            oldDdo.updated,
            account
        )
        let result = null
        if (signature != null)
            result = await this.ocean.aquarius.updateComputePrivacy(
                did,
                serviceIndex,
                computePrivacy.allowRawAlgorithm,
                computePrivacy.allowNetworkAccess,
                computePrivacy.trustedAlgorithms,
                oldDdo.updated,
                signature
            )

        return result
    }

    /**
     * Retire a DDO (Delete)
     * @param  {did} string DID.
     * @param  {Account} account Ethereum account of owner to sign and prove the ownership.
     * @return {Promise<string>}
     */
    public async retire(did: string, account: Account): Promise<string> {
        const oldDdo = await this.ocean.aquarius.retrieveDDO(did)
        // get a signature
        const signature = await this.ocean.utils.signature.signForAquarius(
            oldDdo.updated,
            account
        )
        let result = null
        if (signature != null)
            result = await this.ocean.aquarius.retire(did, oldDdo.updated, signature)
        return result
    }

    /**
     * Returns the creator of a asset.
     * @param  {string} did Decentralized ID.
     * @return {Promise<string>} Returns eth address
     */
    public async creator(did: string): Promise<string> {
        const ddo = await this.resolve(did)
        const checksum = ddo.getChecksum(this.ocean.web3Provider)
        const { creator, signatureValue } = ddo.proof
        const signer = await this.ocean.utils.signature.verifyText(
            checksum,
            signatureValue
        )

        if (signer.toLowerCase() !== creator.toLowerCase()) {
            this.logger.warn(
                `Owner of ${ddo.id} doesn't match. Expected ${creator} instead of ${signer}.`
            )
        }

        return creator
    }

    /**
     * Search over the assets using a query.
     * @param  {SearchQuery} query Query to filter the assets.
     * @return {Promise<DDO[]>}
     */
    public async query(query: SearchQuery) {
        return this.ocean.aquarius.queryMetadata(query)
    }

    /**
     * Search over the assets using a keyword.
     * @param  {SearchQuery} text Text to filter the assets.
     * @return {Promise<DDO[]>}
     */
    public async search(text: string) {
        return this.ocean.aquarius.queryMetadataByText({
            text,
            page: 1,
            offset: 100,
            query: {
                value: 1
            },
            sort: {
                value: 1
            }
        } as SearchQuery)
    }

    public async createAccessServiceAttributes(
        consumerAccount: Account,
        dtCost: number,
        datePublished: string,
        timeout: number = 0
    ): Promise<ServiceAccess> {
        return {
            type: 'access',
            index: 2,
            serviceEndpoint: this.ocean.brizo.getConsumeEndpoint(),
            attributes: {
                main: {
                    creator: consumerAccount.getId(),
                    datePublished,
                    dtCost,
                    timeout: timeout,
                    name: 'dataAssetAccessServiceAgreement'
                }
            }
        }
    }

    public async download(
        dtAddress: string,
        serviceEndpoint: string,
        txId: string,
        account: string
    ): Promise<string> {
        let consumeUrl = serviceEndpoint
        consumeUrl += `?consumerAddress=${account}`
        consumeUrl += `&tokenAddress=${dtAddress}`
        consumeUrl += `&transferTxId=${txId}`

        const serviceConnector = new WebServiceConnector(this.logger)

        try {
            await serviceConnector.downloadFile(consumeUrl)
        } catch (e) {
            this.logger.error('Error consuming assets')
            this.logger.error(e)
            throw e
        }

        return serviceEndpoint
    }
}
