import { TransactionReceipt } from 'web3-core'
import { SearchQuery } from '../aquarius/Aquarius'
import { DDO } from '../ddo/DDO'
import { MetaData, EditableMetaData } from '../ddo/MetaData'
import { Service, ServiceAccess, ServiceComputePrivacy } from '../ddo/Service'
import Account from './Account'
import DID from './DID'
import { fillConditionsWithDDO, SubscribablePromise, didZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { OrderProgressStep } from './utils/ServiceUtils'

export enum CreateProgressStep {
    EncryptingFiles,
    FilesEncrypted,
    GeneratingProof,
    ProofGenerated,
    RegisteringDid,
    DidRegistred,
    StoringDdo,
    DdoStored
}

/**
 * Assets submodule of Ocean Protocol.
 */
export class OceanAssets extends Instantiable {
    /**
     * Returns the instance of OceanAssets.
     * @return {Promise<OceanAssets>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanAssets> {
        const instance = new OceanAssets()
        instance.setInstanceConfig(config)

        return instance
    }

    /**
     * Returns a DDO by DID.
     * @param  {string} did Decentralized ID.
     * @return {Promise<DDO>}
     */
    public async resolve(did: string): Promise<DDO> {
        const {
            serviceEndpoint
        } = await this.ocean.keeper.didRegistry.getAttributesByDid(did)
        return this.ocean.aquarius.retrieveDDOByUrl(serviceEndpoint)
    }

    /**
     * Creates a new DDO.
     * @param  {MetaData} metadata DDO metadata.
     * @param  {Account}  publisher Publisher account.
     * @param  {list} services list of Service description documents
     * @return {Promise<DDO>}
     */
    public create(
        metadata: MetaData,
        publisher: Account,
        services: Service[] = []
    ): SubscribablePromise<CreateProgressStep, DDO> {
        this.logger.log('Creating asset')
        return new SubscribablePromise(async observer => {
            const { secretStoreUri } = this.config
            const { didRegistry, templates } = this.ocean.keeper

            const did: DID = DID.generate()

            this.logger.log('Encrypting files')
            observer.next(CreateProgressStep.EncryptingFiles)
            const encryptedFiles = await this.ocean.secretStore.encrypt(
                did.getId(),
                metadata.main.files,
                publisher
            )
            this.logger.log('Files encrypted')
            observer.next(CreateProgressStep.FilesEncrypted)

            // make sure that access service is defined if services is empty
            if (services.length === 0) {
                const accessService = await this.createAccessServiceAttributes(
                    publisher,
                    metadata.main.price,
                    metadata.main.datePublished
                )
                services.push(accessService)
            }

            const serviceAgreementTemplate = await templates.escrowAccessSecretStoreTemplate.getServiceAgreementTemplate()

            const serviceEndpoint = this.ocean.aquarius.getServiceEndpoint(did)

            let indexCount = 0
            // create ddo itself
            const ddo: DDO = new DDO({
                id: did.getDid(),
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
                        type: 'authorization',
                        service: 'SecretStore',
                        serviceEndpoint: secretStoreUri,
                        attributes: { main: {} }
                    },
                    {
                        type: 'metadata',
                        serviceEndpoint,
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
                    .map(_ => ({
                        ..._,
                        index: indexCount++
                    })) as Service[]
            })

            // Overwrite initial service agreement conditions
            serviceAgreementTemplate.conditions = fillConditionsWithDDO(
                await templates.escrowAccessSecretStoreTemplate.getServiceAgreementTemplateConditions(),
                ddo
            )
            for (const service of services) {
                if (service.type === 'compute') {
                    service.attributes.serviceAgreementTemplate.conditions = fillConditionsWithDDO(
                        await templates.escrowComputeExecutionTemplate.getServiceAgreementTemplateConditions(),
                        ddo
                    )
                }
            }

            this.logger.log('Generating proof')
            observer.next(CreateProgressStep.GeneratingProof)
            await ddo.addProof(this.ocean, publisher.getId(), publisher.getPassword())
            this.logger.log('Proof generated')
            observer.next(CreateProgressStep.ProofGenerated)

            this.logger.log('Registering DID')
            observer.next(CreateProgressStep.RegisteringDid)
            await didRegistry.registerAttribute(
                did.getId(),
                ddo.getChecksum(),
                [this.config.brizoAddress],
                serviceEndpoint,
                publisher.getId()
            )
            this.logger.log('DID registred')
            observer.next(CreateProgressStep.DidRegistred)

            this.logger.log('Storing DDO')
            observer.next(CreateProgressStep.StoringDdo)
            const storedDdo = await this.ocean.aquarius.storeDDO(ddo)
            this.logger.log('DDO stored')
            observer.next(CreateProgressStep.DdoStored)

            return storedDdo
        })
    }

    public async consume(
        agreementId: string,
        did: string,
        consumerAccount: Account,
        resultPath: string,
        index?: number,
        useSecretStore?: boolean
    ): Promise<string>

    /* eslint-disable no-dupe-class-members */
    public async consume(
        agreementId: string,
        did: string,
        consumerAccount: Account,
        resultPath?: undefined | null,
        index?: number,
        useSecretStore?: boolean
    ): Promise<true>

    public async consume(
        agreementId: string,
        did: string,
        consumerAccount: Account,
        resultPath?: string,
        index: number = -1,
        useSecretStore?: boolean
    ): Promise<string | true> {
        const ddo = await this.resolve(did)
        const { attributes } = ddo.findServiceByType('metadata')
        const accessService = ddo.findServiceByType('access')

        const { files } = attributes.main

        const { serviceEndpoint } = accessService

        if (!serviceEndpoint) {
            throw new Error(
                'Consume asset failed, service definition is missing the `serviceEndpoint`.'
            )
        }

        this.logger.log('Consuming files')

        resultPath = resultPath
            ? `${resultPath}/datafile.${ddo.shortId()}.${accessService.index}/`
            : undefined

        if (!useSecretStore) {
            await this.ocean.brizo.consumeService(
                agreementId,
                serviceEndpoint,
                consumerAccount,
                files,
                resultPath,
                index
            )
        } else {
            const files = await this.ocean.secretStore.decrypt(
                did,
                ddo.findServiceByType('metadata').attributes.encryptedFiles,
                consumerAccount,
                ddo.findServiceByType('authorization').serviceEndpoint
            )
            const downloads = files
                .filter(({ index: i }) => index === -1 || index === i)
                .map(({ url, index: i }) =>
                    this.ocean.utils.fetch.downloadFile(url, resultPath, i)
                )
            await Promise.all(downloads)
        }
        this.logger.log('Files consumed')

        if (resultPath) {
            return resultPath
        }
        return true
    }
    /* eslint-enable no-dupe-class-members */

    /**
     * Start the purchase/order of an asset's service. Starts by signing the service agreement
     * then sends the request to the publisher via the service endpoint (Brizo http service).
     * @param  {string} did Decentralized ID.
     * @param  {Account} consumerAccount Consumer account.
     * @param  {string} provider ethereum address of service provider (optional)
     * @return {Promise<string>} Returns Agreement ID
     */
    public order(
        did: string,
        consumerAccount: Account,
        provider?: string
    ): SubscribablePromise<OrderProgressStep, string> {
        return new SubscribablePromise(async observer => {
            const { keeper, utils } = this.ocean
            const ddo: DDO = await this.resolve(did)
            const condition = keeper.conditions.accessSecretStoreCondition

            const agreementId = await utils.services.order(
                'access',
                condition,
                observer,
                consumerAccount,
                ddo,
                provider
            )

            return agreementId
        })
    }

    /**
     * Returns the owner of an asset.
     * @param  {string} did Decentralized ID.
     * @return {Promise<string>} Returns Account ID
     */
    public async owner(did: string): Promise<string> {
        const owner = await this.ocean.keeper.didRegistry.getDIDOwner(did)
        return owner
    }

    /**
     * Returns the creator of a asset.
     * @param  {string} did Decentralized ID.
     * @return {Promise<string>} Returns eth address
     */
    public async creator(did: string): Promise<string> {
        const ddo = await this.resolve(did)
        const checksum = ddo.getChecksum()
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
     * Returns the assets of a owner.
     * @param  {string} owner Owner address.
     * @return {Promise<string[]>} List of DIDs.
     */
    public async ownerAssets(owner: string): Promise<string[]> {
        return this.ocean.keeper.didRegistry.getAttributesByOwner(owner)
    }

    /**
     * Transfer ownership of an asset.
     * @param  {string} did Asset DID.
     * @param  {string} newOwner Ethereum address of the new owner of the DID.
     * @param  {Account} account Ethereum account of original/old owner to sign and prove the ownership.
     * @return {Promise<TransactionReceipt>} Returns Web3 transaction receipt.
     */
    public async transferOwnership(
        did: string,
        newOwner: string,
        account: Account
    ): Promise<TransactionReceipt> {
        const oldOwner = await this.ocean.assets.owner(did)
        const oldDdo = await this.ocean.aquarius.retrieveDDO(did)

        // update owner on-chain
        const txReceipt = this.ocean.keeper.didRegistry.transferDIDOwnership(
            did,
            newOwner,
            oldOwner
        )
        // get a signature
        const signature = await this.ocean.utils.signature.signForAquarius(
            oldDdo.updated,
            account
        )
        if (signature != null)
            await this.ocean.aquarius.transferOwnership(
                did,
                newOwner,
                oldDdo.updated,
                signature
            )

        return txReceipt
    }

    /**
     * Edit Metadata for a DDO.
     * @param  {did} string DID.
     * @param  {newMetadata}  EditableMetaData Metadata fields & new values.
     * @param  {Account} account Ethereum account of owner to sign and prove the ownership.
     * @return {Promise<string>}
     */
    public async editMetadata(
        did: string,
        newMetadata: EditableMetaData,
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
     * Returns the assets of a consumer.
     * @param  {string} consumer Consumer address.
     * @return {Promise<string[]>} List of DIDs.
     */
    public async consumerAssets(consumer: string): Promise<string[]> {
        return (
            await this.ocean.keeper.conditions.accessSecretStoreCondition.getGrantedDidByConsumer(
                consumer
            )
        ).map(({ did }) => did)
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
        price: string,
        datePublished: string,
        timeout: number = 0
    ): Promise<ServiceAccess> {
        const { templates } = this.ocean.keeper
        const serviceAgreementTemplate = await templates.escrowAccessSecretStoreTemplate.getServiceAgreementTemplate()
        return {
            type: 'access',
            index: 2,
            serviceEndpoint: this.ocean.brizo.getConsumeEndpoint(),
            templateId: templates.escrowAccessSecretStoreTemplate.getId(),
            attributes: {
                main: {
                    creator: consumerAccount.getId(),
                    datePublished,
                    price,
                    timeout: timeout,
                    name: 'dataAssetAccessServiceAgreement'
                },
                serviceAgreementTemplate
            }
        }
    }

    /**
     * Get FreeWhiteList for a DID
     * @param  {string} did Asset DID.
     * @return {Promise<string[]>} List of addresses.
     */
    public async getFreeWhiteList(did: string): Promise<string[]> {
        const events = await this.ocean.keeper.didRegistry.getPastEvents(
            'DIDPermissionGranted',
            {
                _did: didZeroX(did)
            }
        )
        const list = events.map(({ returnValues }) => returnValues._grantee)
        const filteredList = []
        for (let index = 0; index < list.length; index++) {
            const address = list[index]
            const hasPermission = await this.ocean.keeper.didRegistry.getPermission(
                did,
                address
            )
            if (hasPermission) filteredList.push(address)
        }
        return filteredList
    }

    /**
     * Add consumer to FreeWhiteList for a DID
     * @param  {string} did Asset DID.
     * @param  {string} consumer Ethereum address to add to the list.
     * @param  {Account} account Ethereum account of DID owner
     * @return None
     */
    public async addConsumerToFreeWhiteList(
        did: string,
        consumer: string,
        account: Account
    ): Promise<TransactionReceipt> {
        await this.ocean.keeper.didRegistry.grantPermission(
            did,
            consumer,
            account.getId()
        )
    }

    /**
     * Remove consumer from DID's FreeWhiteList
     * @param  {string} did Asset DID.
     * @param  {string} consumer Ethereum address to add to the list.
     * @param  {Account} account Ethereum account of DID owner
     * @return None
     */
    public async removeConsumerFromFreeWhiteList(
        did: string,
        consumer: string,
        account: Account
    ): Promise<TransactionReceipt> {
        await this.ocean.keeper.didRegistry.revokePermission(
            did,
            consumer,
            account.getId()
        )
    }
}
