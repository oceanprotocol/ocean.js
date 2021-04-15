import { EditableMetadataLinks } from './EditableMetadataLinks'

export interface EditableMetadata {
  description?: string
  title?: string
  links?: EditableMetadataLinks[]
  isDisable?: boolean
}
