import { File, MetaDataAlgorithm } from '../ddo/MetaData'
import Account from '../ocean/Account'
import { noZeroX } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'
import { DDO } from '../ddo/DDO'
import { ServiceType } from '../ddo/Service'
import { ComputeJob, Output } from '../ocean/Compute'

const apiPath = '/api/v1/brizo/services'

/**
 * Provides a interface with Brizo.
 * Brizo is the technical component executed by the Publishers allowing to them to provide extended data services.
 */
export class Brizo extends Instantiable {
    private get url() {
        return this.config.brizoUri
    }

    constructor(config: InstantiableConfig) {
        super()
        this.setInstanceConfig(config)
    }

    public async getVersionInfo() {
        return (await this.ocean.utils.fetch.get(this.url)).json()
    }

    public getPurchaseEndpoint() {
        return `${this.url}${apiPath}/access/initialize`
    }

    public getConsumeEndpoint() {
        return `${this.url}${apiPath}/consume`
    }

    public getEncryptEndpoint() {
        return `${this.url}${apiPath}/publish`
    }

    public getComputeEndpoint() {
        return `${this.url}${apiPath}/compute`
    }

    public async getEndpointFromAgreement(
        type: ServiceType,
        agreementId: string
    ): Promise<string> {
        const { assets, keeper } = this.ocean
        const { did } = await keeper.agreementStoreManager.getAgreement(agreementId)
        const ddo: DDO = await assets.resolve(did)
        const { serviceEndpoint } = ddo.findServiceByType(type)

        return serviceEndpoint
    }

    public async initializeServiceAgreement(
        did: string,
        serviceAgreementId: string,
        serviceIndex: number,
        signature: string,
        consumerAddress: string
    ): Promise<any> {
        const args = {
            did,
            serviceAgreementId,
            serviceIndex,
            signature,
            consumerAddress
        }

        try {
            return await this.ocean.utils.fetch.post(
                this.getPurchaseEndpoint(),
                decodeURI(JSON.stringify(args))
            )
        } catch (e) {
            this.logger.error(e)
            throw new Error('HTTP request failed')
        }
    }

    public async consumeService(
        agreementId: string,
        serviceEndpoint: string,
        account: Account,
        files: File[],
        destination: string,
        index: number = -1
    ): Promise<string> {
        const signature = await this.createSignature(account, agreementId)
        const filesPromises = files
            .filter((_, i) => index === -1 || i === index)
            .map(async ({ index: i }) => {
                let consumeUrl = serviceEndpoint
                consumeUrl += `?index=${i}`
                consumeUrl += `&serviceAgreementId=${noZeroX(agreementId)}`
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

    public async compute(
        method: string,
        serviceAgreementId: string,
        consumerAccount: Account,
        algorithmDid?: string,
        algorithmMeta?: MetaDataAlgorithm,
        jobId?: string,
        output?: Output
    ): Promise<ComputeJob | ComputeJob[]> {
        const address = consumerAccount.getId()

        let signatureMessage = address
        signatureMessage += jobId || ''
        signatureMessage += (serviceAgreementId && `${noZeroX(serviceAgreementId)}`) || ''
        const signature = await this.createHashSignature(
            consumerAccount,
            signatureMessage
        )

        const serviceEndpoint = serviceAgreementId
            ? await this.getEndpointFromAgreement('compute', serviceAgreementId)
            : this.getComputeEndpoint()

        if (!serviceEndpoint) {
            throw new Error(
                'Computing on asset failed, service definition is missing the `serviceEndpoint`.'
            )
        }

        // construct Brizo URL
        let url = serviceEndpoint
        url += `?signature=${signature}`
        url += `&consumerAddress=${address}`
        url += `&serviceAgreementId=${noZeroX(serviceAgreementId)}`
        url += (algorithmDid && `&algorithmDid=${algorithmDid}`) || ''
        url +=
            (algorithmMeta &&
                `&algorithmMeta=${encodeURIComponent(JSON.stringify(algorithmMeta))}`) ||
            ''
        url += (output && `&output=${JSON.stringify(output)}`) || ''
        url += (jobId && `&jobId=${jobId}`) || ''

        // switch fetch method
        let fetch

        switch (method) {
            case 'post':
                fetch = this.ocean.utils.fetch.post(url, '')
                break
            case 'put':
                fetch = this.ocean.utils.fetch.put(url, '')
                break
            case 'delete':
                fetch = this.ocean.utils.fetch.delete(url)
                break
            default:
                fetch = this.ocean.utils.fetch.get(url)
                break
        }

        const result = await fetch
            .then((response: any) => {
                if (response.ok) {
                    return response.json()
                }

                this.logger.error(
                    'Compute job failed:',
                    response.status,
                    response.statusText
                )

                return null
            })
            .catch((error: Error) => {
                this.logger.error('Error with compute job')
                this.logger.error(error.message)
                throw error
            })

        return result
    }

    public async createSignature(account: Account, agreementId: string): Promise<string> {
        const signature =
            (await account.getToken()) ||
            (await this.ocean.utils.signature.signText(
                noZeroX(agreementId),
                account.getId()
            ))

        return signature
    }

    public async createHashSignature(account: Account, message: string): Promise<string> {
        const signature =
            (await account.getToken()) ||
            (await this.ocean.utils.signature.signWithHash(message, account.getId()))

        return signature
    }

    public async encrypt(
        did: string,
        signature: string,
        document: any,
        publisher: string
    ): Promise<string> {
        const args = {
            documentId: did,
            signature,
            document: JSON.stringify(document),
            publisherAddress: publisher
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
