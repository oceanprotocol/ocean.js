import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

const apiPath = '/api/v1/services/'

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

    public async getVersionInfo() {
        return (await this.ocean.utils.fetch.get(this.url)).json()
    }

    public getURI() {
        return `${this.url}`
    }

    public getPurchaseEndpoint() {
        return `${this.url}${apiPath}/access/initialize`
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

    public async encrypt(
        did: string,
        document: any,
        account: Account,
        dtAddress: string
    ): Promise<string> {
        const signature = this.ocean.utils.signature.signWithHash(
            did,
            account.getId(),
            account.getPassword()
        )

        const args = {
            did,
            signature,
            document: JSON.stringify(document),
            publisherAddress: account.getId()
        }

        try {
            const response = await this.ocean.utils.fetch.post(
                this.getEncryptEndpoint(),
                decodeURI(JSON.stringify(args))
            )
            if (!response.ok) {
                throw new Error('HTTP request failed')
            }
            return await response.text()
        } catch (e) {
            this.logger.error(e)
            throw new Error('HTTP request failed')
        }
    }
}
