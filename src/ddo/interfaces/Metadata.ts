import { MetadataMain } from './MetadataMain'
import { AdditionalInformation } from './AdditionalInformation'
import { Curation } from './Curation'

export interface Metadata {
    main: MetadataMain
    encryptedFiles?: string
    additionalInformation?: AdditionalInformation
    curation?: Curation
}
