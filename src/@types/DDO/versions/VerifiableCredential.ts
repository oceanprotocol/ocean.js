import { AdditionalVerifiableCredentials } from '../AdditionalVerifiableCredentials'
import { CredentialSubject } from '../CredentialSubject'
import { BaseDDOType } from './BaseDDO'

export interface VerifiableCredentialType extends BaseDDOType {
  /**
   * id optional for verifiable credential
   * @type {string}
   */
  id?: string

  /**
   * @type {CredentialSubject}
   */
  credentialSubject: CredentialSubject

  /**
   * Id of issuer
   * @type {string}
   */
  issuer: string

  /**
   * Additional ddos
   * @type {AdditionalVerifiableCredentials[]}
   */
  additionalDdos?: AdditionalVerifiableCredentials[]
}
