import { DDO } from '../../ddo/DDO'
import Account from '../Account'
import { zeroX, Logger, generateId } from '../../utils'
import { Ocean } from '../../squid'
import { Condition } from '../../keeper/contracts/conditions'
import { ServiceType, Service } from '../../ddo/Service'

export enum OrderProgressStep {
    CreatingAgreement,
    AgreementInitialized,
    LockingPayment,
    LockedPayment
}

export class ServiceUtils {
    private ocean: Ocean
    private logger: Logger

    constructor(ocean: Ocean, logger: Logger) {
        this.ocean = ocean
        this.logger = logger
    }

    public async order(
        type: ServiceType,
        condition: Condition,
        observer: any,
        consumerAccount: Account,
        ddo: DDO,
        provider?: string
    ): Promise<string> {
        const { keeper, agreements } = this.ocean

        const agreementId = zeroX(generateId())
        const service: Service = ddo.findServiceByType(type)
        const metadata = ddo.findServiceByType('metadata')

        const templateName = service.attributes.serviceAgreementTemplate.contractName
        const template = keeper.getTemplateByName(templateName)

        // use price from compute service,
        // otherwise always take the price from metadata
        const price =
            type === 'compute'
                ? service.attributes.main.price
                : metadata.attributes.main.price

        // eslint-disable-next-line no-async-promise-executor
        const paymentFlow = new Promise(async (resolve, reject) => {
            await template.getAgreementCreatedEvent(agreementId).once()

            this.logger.log('Agreement initialized')
            observer.next(OrderProgressStep.AgreementInitialized)

            this.logger.log('Locking payment')

            const serviceGranted = condition
                .getConditionFulfilledEvent(agreementId)
                .once()

            observer.next(OrderProgressStep.LockingPayment)
            const paid = await agreements.conditions.lockReward(
                agreementId,
                price,
                consumerAccount
            )
            observer.next(OrderProgressStep.LockedPayment)

            if (paid) {
                this.logger.log('Payment was OK')
            } else {
                this.logger.error('Payment was KO')
                this.logger.error('Agreement ID: ', agreementId)
                this.logger.error('DID: ', ddo.id)
                reject(new Error('Error on payment'))
            }

            await serviceGranted

            this.logger.log(`Service ${type} granted`)
            resolve()
        })

        observer.next(OrderProgressStep.CreatingAgreement)
        this.logger.log('Creating agreement')

        // Get provider from didRegistry if not given in arguments
        let _provider = provider
        if (!provider) {
            const providers = await keeper.didRegistry.getDIDProviders(ddo.shortId())
            if (providers) {
                _provider = providers[0]
            }
        }

        await agreements.create(
            ddo.id,
            agreementId,
            service.index,
            undefined,
            consumerAccount,
            _provider,
            consumerAccount
        )
        this.logger.log('Agreement created')

        try {
            await paymentFlow
        } catch (e) {
            throw new Error(`Error paying the ${type} service.`)
        }

        return agreementId
    }
}
