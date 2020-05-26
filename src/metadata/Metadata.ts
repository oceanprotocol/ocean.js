import Web3Provider from '../keeper/Web3Provider'
import { Ocean } from '../ocean/Ocean'
import { Authentication } from './Authentication'
import { Proof } from './Proof'
import { PublicKey } from './PublicKey'
import { Service, ServiceType } from './Service'

/**
 * DID Descriptor Object.
 * Contains all the data related to an asset.
 */
export class Metadata {
    /**
     * Serializes the Metadata object.
     * @param  {Metadata} Metadata to be serialized.
     * @return {string} Metadata serialized.
     */
    public static serialize(metadata: Metadata): string {
        return JSON.stringify(metadata, null, 2)
    }

    /**
     * Deserializes the Metadata object.
     * @param  {Metadata} Metadata to be deserialized.
     * @return {string} Metadata deserialized.
     */
    public static deserialize(metadataString: string): Metadata {
        const metadata = JSON.parse(metadataString)

        return new Metadata(metadata)
    }

    public '@context': string = 'https://w3id.org/did/v1'

    /**
     * DID, descentralized ID.
     * @type {string}
     */
    public id: string = null

    public created: string

    public updated: string

    public dtAddress: string

    public publicKey: PublicKey[] = []

    public authentication: Authentication[] = []

    public service: Service[] = []

    public proof: Proof

    public constructor(metadata: Partial<Metadata> = {}) {
        Object.assign(this, metadata, {
            created:
                (metadata && metadata.created) || new Date().toISOString().replace(/\.[0-9]{3}/, '')
        })
    }

    public shortId(): string {
        //TODO: should be replacing did:op thing 
        return this.id.replace('did:op:', '')
    }

    /**
     * Finds a service of a Metadata by index.
     * @param  {number} Service index.
     * @return {Service} Service.
     */
    public findServiceById<T extends ServiceType>(index: number): Service<T> {
        if (isNaN(index)) {
            throw new Error('index is not set')
        }

        const service = this.service.find(s => s.index === index)

        return service as Service<T>
    }

    /**
     * Finds a service of a Metadata by type.
     * @param  {string} serviceType Service type.
     * @return {Service} Service.
     */
    public findServiceByType<T extends ServiceType>(serviceType: T): Service<T> {
        if (!serviceType) {
            throw new Error('serviceType not set')
        }

        return this.service.find(s => s.type === serviceType) as Service<T>
    }

    /**
     * Generate the checksum using the current content.
     * @return {string[]} Metadata checksum.
     */
    public getChecksum(): string {
        const { attributes } = this.findServiceByType('metadata')
        const { files, name, author, license } = attributes.main

        const values = [
            ...(files || []).map(({ checksum }) => checksum).filter(_ => !!_),
            name,
            author,
            license,
            this.id
        ]

        return Web3Provider.getWeb3()
            .utils.sha3(values.join(''))
            .replace(/^0x([a-f0-9]{64})(:!.+)?$/i, '0x$1')
    }

    /**
     * Generates proof using personal sing.
     * @param  {Ocean}          ocean     Ocean instance.
     * @param  {string}         publicKey Public key to be used on personal sign.
     * @param  {string}         password  Password if it's required.
     * @return {Promise<Proof>}           Proof object.
     */
    public async generateProof(
        ocean: Ocean,
        publicKey: string,
        password?: string
    ): Promise<Proof> {
        const checksum = this.getChecksum()

        const signature = await ocean.utils.signature.signText(
            checksum,
            publicKey,
            password
        )

        return {
            created: new Date().toISOString().replace(/\.[0-9]{3}/, ''),
            creator: publicKey,
            type: 'MetadataIntegritySignature',
            signatureValue: signature
        }
    }

    /**
     * Generates and adds a proof using personal sing on the Metadata.
     * @param  {Ocean}          ocean     Ocean instance.
     * @param  {string}         publicKey Public key to be used on personal sign.
     * @param  {string}         password  Password if it's required.
     * @return {Promise<Proof>}           Proof object.
     */
    public async addProof(
        ocean: Ocean,
        publicKey: string,
        password?: string
    ): Promise<void> {
        if (this.proof) {
            throw new Error('Proof already exists')
        }
        this.proof = await this.generateProof(ocean, publicKey, password)
    }
}
