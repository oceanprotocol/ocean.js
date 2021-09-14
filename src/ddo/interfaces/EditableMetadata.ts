import { EditableMetadataLinks } from './EditableMetadataLinks'
import { Status } from './Status'

export interface EditableMetadata {
  description?: string
  author?: string
  title?: string
  links?: EditableMetadataLinks[]
  status?: Status
}
