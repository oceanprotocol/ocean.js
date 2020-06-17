import { EditableMetadataLinks } from './EditableMetadataLinks'
import { ServicePrices } from './ServicePrices'

export interface EditableMetadata {
    description?: string
    title?: string
    links?: EditableMetadataLinks[]
    servicePrices?: ServicePrices[]
}
