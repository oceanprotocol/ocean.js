import { LanguageValueObject } from './LanguageValueObject'
import { RemoteSource } from './RemoteSource'

export interface RemoteObject {
  name: string
  displayName?: LanguageValueObject
  description?: LanguageValueObject
  fileType: string
  sha256: string
  mirrors: RemoteSource[]
  additionalInformation?: Record<string, string | number | boolean>
}
