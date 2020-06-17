import { SearchQuery } from '../aquarius/Aquarius'
import { DDO } from '../ddo/DDO'
import { Metadata } from '../ddo/interfaces/Metadata'
import { Service } from '../ddo/interfaces/Service'
import Account from './Account'
import DID from './DID'
import { SubscribablePromise, didZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

import { DataTokens } from '../lib'

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
     * @param  {MetaData} metadata DDO metadata.
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
}
