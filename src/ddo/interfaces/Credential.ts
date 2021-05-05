import { CredentialDetail } from './CredentialDetail'

export interface Credential {
  allow?: CredentialDetail[]
  deny?: CredentialDetail[]
}
