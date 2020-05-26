import { ServiceAgreementTemplateCondition } from '../../ddo/ServiceAgreementTemplate'
import { DDO } from '../../ddo/DDO'
import { ServiceAccess } from '../../ddo/Service'
import Account from '../Account'
import { zeroX, Logger } from '../../utils'
import { Ocean } from '../../squid'
import Web3 from 'web3'

export class ServiceAgreement {
    private ocean: Ocean
    private logger: Logger
    private web3: Web3
    constructor(ocean: Ocean, logger: Logger, web3: Web3) {
        this.ocean = ocean
        this.logger = logger
        this.web3 = web3
    }

    public async signServiceAgreement(
        ddo: DDO,
        index: number,
        serviceAgreementId: string,
        agreementConditionsIds: string[],
        consumer: Account
    ): Promise<string> {
        const service = ddo.findServiceById<'access'>(index)
        const timelockValues: number[] = this.getTimeValuesFromService(
            service,
            'timelock'
        )
        const timeoutValues: number[] = this.getTimeValuesFromService(service, 'timeout')

        if (!service.templateId) {
            throw new Error('TemplateId not found in DDO.')
        }

        const serviceAgreementHashSignature = await this.createHashSignature(
            service.templateId,
            serviceAgreementId,
            agreementConditionsIds,
            timelockValues,
            timeoutValues,
            consumer
        )

        this.logger.debug('SA hash signature:', serviceAgreementHashSignature)

        return zeroX(serviceAgreementHashSignature)
    }

    public async createHashSignature(
        templateId: string,
        serviceAgreementId: string,
        valueHashes: string[],
        timelockValues: number[],
        timeoutValues: number[],
        consumer: Account
    ): Promise<string> {
        const serviceAgreementHash = this.hashServiceAgreement(
            templateId,
            serviceAgreementId,
            valueHashes,
            timelockValues,
            timeoutValues
        )

        const serviceAgreementHashSignature = await this.ocean.utils.signature.signText(
            serviceAgreementHash,
            consumer.getId(),
            consumer.getPassword()
        )

        return serviceAgreementHashSignature
    }

    public hashServiceAgreement(
        serviceAgreementTemplateId: string,
        serviceAgreementId: string,
        valueHashes: string[],
        timelocks: number[],
        timeouts: number[]
    ): string {
        const args: any = [
            { type: 'bytes32', value: zeroX(serviceAgreementTemplateId) },
            { type: 'bytes32[]', value: valueHashes.map(zeroX) },
            { type: 'uint256[]', value: timelocks },
            { type: 'uint256[]', value: timeouts },
            { type: 'bytes32', value: zeroX(serviceAgreementId) }
        ]

        return this.web3.utils.soliditySha3(...args)
    }

    private getTimeValuesFromService(
        service: ServiceAccess,
        type: 'timeout' | 'timelock'
    ): number[] {
        const timeoutValues: number[] = service.attributes.serviceAgreementTemplate.conditions.map(
            (condition: ServiceAgreementTemplateCondition) => condition[type]
        )

        return timeoutValues
    }
}
