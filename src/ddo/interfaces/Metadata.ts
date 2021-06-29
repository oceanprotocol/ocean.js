import { MetadataMain } from './MetadataMain'
import { AdditionalInformation } from './AdditionalInformation'
import { Curation } from './Curation'
import { Status } from './Status'

export interface Metadata {
  main: MetadataMain
  encryptedFiles?: string
  additionalInformation?: AdditionalInformation
  curation?: Curation
  status?: Status
}

export interface ValidateMetadata {
  valid: Boolean
  errors?: Object
}
