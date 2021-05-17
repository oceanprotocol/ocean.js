import { MetadataMain } from './MetadataMain'
import { AdditionalInformation } from './AdditionalInformation'
import { Status } from './Status'

export interface Metadata {
  main: MetadataMain
  encryptedFiles?: string
  additionalInformation?: AdditionalInformation
  status?: Status
}
