import { DDO } from '../metadata/Metadata'
import {
    ServiceAgreementTemplateCondition,
    ServiceAgreementTemplateParameter
} from '../metadata/ServiceAgreementTemplate'

function fillParameterWithDDO(
    parameter: ServiceAgreementTemplateParameter,
    ddo: DDO
): ServiceAgreementTemplateParameter {
    const getValue = name => {
        switch (name) {
            case 'amount':
            case 'price':
                return String(ddo.findServiceByType('metadata').attributes.main.price)
            case 'assetId':
            case 'documentId':
            case 'documentKeyId':
                return ddo.shortId()
            case 'rewardAddress':
                return ddo.publicKey[0].owner
        }

        return ''
    }
    const value = getValue(parameter.name.replace(/^_/, ''))

    return { ...parameter, value }
}

/**
 * Fill some static parameters that depends on the metadata.
 * @param  {ServiceAgreementTemplateCondition[]} conditions Conditions to fill.
 * @param  {DDO}                                 ddo        DDO related to this conditions.
 * @return {ServiceAgreementTemplateCondition[]}            Filled conditions.
 */
export function fillConditionsWithDDO(
    conditions: ServiceAgreementTemplateCondition[],
    ddo: DDO
): ServiceAgreementTemplateCondition[] {
    return conditions.map(condition => ({
        ...condition,
        parameters: condition.parameters.map(parameter => ({
            ...fillParameterWithDDO(parameter, ddo)
        }))
    }))
}
