import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { File } from '../ddo/interfaces/File'

const apiPath = '/api/v1/services'

/**
 * Provides an interface for provider service.
 * Provider service is the technical component executed
 * by the Publishers allowing to them to provide extended
 * data services.
 */
export class Provider extends Instantiable {
    private get url() {
        return this.config.providerUri
    }

    constructor(config: InstantiableConfig) {
        super()
        this.setInstanceConfig(config)
    }

    public async createSignature(account: Account, agreementId: string): Promise<string> {
        const signature = await this.ocean.utils.signature.signText(
            noZeroX(agreementId),
            account.getId()
        )

        return signature
    }

    public async createHashSignature(account: Account, message: string): Promise<string> {
        const signature = await this.ocean.utils.signature.signWithHash(
            message,
            account.getId()
        )

        return signature
    }

    public async encrypt(did: string, document: any, account: Account): Promise<string> {
        const signature = await this.ocean.utils.signature.signWithHash(
            did,
            account.getId(),
            account.getPassword()
        )

        const args = {
            documentId: did,
            signature: signature,
            document: JSON.stringify(document),
            publisherAddress: account.getId()
        }
        try {
            const response = await this.ocean.utils.fetch.post(
                this.getEncryptEndpoint(),
                decodeURI(JSON.stringify(args))
            )
            return await response.text()
        } catch (e) {
            this.logger.error(e)
            throw new Error('HTTP request failed')
        }
    }

    public async initialize(
        did: string,
        serviceIndex: number,
        serviceType: string,
        consumerAddress: string
    ): Promise<string> {
        let DDO
        try {
            DDO = await this.ocean.assets.resolve(did)
        } catch (e) {
            this.logger.error(e)
            throw new Error('Failed to resolve DID')
        }

        let initializeUrl = this.getInitializeEndpoint()
        initializeUrl += `?documentId=${did}`
        initializeUrl += `&serviceId=${serviceIndex}`
        initializeUrl += `&serviceType=${serviceType}`
        initializeUrl += `&tokenAddress=${DDO.dataToken}`
        initializeUrl += `&consumerAddress=${consumerAddress}`

        try {
            const response = await this.ocean.utils.fetch.get(initializeUrl)
            return await response.text()
        } catch (e) {
            this.logger.error(e)
            throw new Error('HTTP request failed')
        }
    }

    public async download(
        did: string,
        txId: string,
        tokenAddress: string,
        serviceType: string,
        serviceIndex: string,
        destination: string,
        account: Account,
        files: File[],
        index: number = -1
    ): Promise<any> {
        const signature = await this.createSignature(account, did)
        const filesPromises = files
            .filter((_, i) => index === -1 || i === index)
            .map(async ({ index: i }) => {
                let consumeUrl = this.getDownloadEndpoint()
                consumeUrl += `?index=${i}`
                consumeUrl += `&documentId=${did}`
                consumeUrl += `&serviceId=${serviceIndex}`
                consumeUrl += `&serviceType=${serviceType}`
                consumeUrl += `tokenAddress=${tokenAddress}`
                consumeUrl += `&transferTxId=${txId}`
                consumeUrl += `&consumerAddress=${account.getId()}`
                consumeUrl += `&signature=${signature}`

                try {
                    await this.ocean.utils.fetch.downloadFile(consumeUrl, destination, i)
                } catch (e) {
                    this.logger.error('Error consuming assets')
                    this.logger.error(e)
                    throw e
                }
            })
        await Promise.all(filesPromises)
        return destination
    }

    public async getVersionInfo() {
        return (await this.ocean.utils.fetch.get(this.url)).json()
    }

    public getURI() {
        return `${this.url}`
    }

    public getInitializeEndpoint() {
        return `${this.url}${apiPath}/initialize`
    }

    public getConsumeEndpoint() {
        return `${this.url}${apiPath}/consume`
    }

    public getEncryptEndpoint() {
        return `${this.url}${apiPath}/encrypt`
    }

    public getPublishEndpoint() {
        return `${this.url}${apiPath}/publish`
    }

    public getComputeEndpoint() {
        return `${this.url}${apiPath}/compute`
    }

    public getDownloadEndpoint() {
        return `${this.url}${apiPath}/download`
    }
}
