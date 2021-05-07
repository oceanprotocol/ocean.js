import { Curation } from './Curation'
import { EditableMetadataLinks } from './EditableMetadataLinks'

export interface EditableMetadata {
  description?: string
  title?: string
  links?: EditableMetadataLinks[]
  curation?: Curation
}
