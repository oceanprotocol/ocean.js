import { DDO } from '../ddo/DDO'
import {
  Credentials,
  Credential,
  CredentialType,
  CredentialAction
} from '../ddo/interfaces/Credentials'

/**
 * checks if a credential list exists for a specific action
 * @param  {credentials} Credentials list of crentials from ddo
 * @param {credentialType} CredentialType e.g. address / credential3Box
 * @param {credentialAction} CredentialAction allow or deny
 * @return {boolean}
 */
export function checkCredentialExist(
  credentials: Credentials,
  credentialType: CredentialType,
  credentialAction: CredentialAction
): boolean {
  let isExist = false
  if (credentialAction === 'allow') {
    if (credentials && credentials.allow) {
      const allowList = credentials.allow.find(
        (credential) => credential.type === credentialType
      )
      isExist = allowList && allowList.value.length > 0
    }
    return isExist
  } else {
    if (credentials && credentials.deny) {
      const dennyList = credentials.deny.find(
        (credential) => credential.type === credentialType
      )
      isExist = dennyList && dennyList.value.length > 0
    }
    return isExist
  }
}

/**
 * Removes all credentials of a certain type for a specific action
 * @param  {ddo} DDO
 * @param {credentialType} CredentialType e.g. address / credential3Box
 * @param {credentialAction} CredentialAction allow or deny
 * @return {DDO}
 */
export function removeCredentialDetail(
  ddo: DDO,
  credentialType: CredentialType,
  credentialAction: CredentialAction
): DDO {
  const exists = checkCredentialExist(ddo.credentials, credentialType, credentialAction)
  if (credentialAction === 'allow') {
    if (exists) {
      ddo.credentials.allow = ddo.credentials.allow.filter(
        (credential) => credential.type !== credentialType
      )
    }
    if (ddo.credentials && !ddo.credentials.allow) {
      ddo.credentials = {
        deny: ddo.credentials && ddo.credentials.deny
      }
    }
  } else {
    if (exists) {
      ddo.credentials.deny = ddo.credentials.deny.filter(
        (credential) => credential.type !== credentialType
      )
    }
    if (ddo.credentials && !ddo.credentials.deny) {
      ddo.credentials = {
        allow: ddo.credentials && ddo.credentials.allow
      }
    }
  }
  return ddo
}

/**
 * Updates credentials of a certain type for a specific action
 * @param  {ddo} DDO
 * @param {credentialType} CredentialType e.g. address / credential3Box
 * @param {list} string[] list of values
 * @param {credentialAction} CredentialAction allow or deny
 * @return {DDO}
 */

export function updateCredentialDetail(
  ddo: DDO,
  credentialType: CredentialType,
  list: string[],
  credentialAction: CredentialAction
): DDO {
  const exists = checkCredentialExist(ddo.credentials, credentialType, credentialAction)
  if (credentialAction === 'allow') {
    if (exists) {
      ddo.credentials.allow.find((credential) => {
        if (credential.type === credentialType) {
          credential.values = list
        }
      })
    } else {
      ddo = addCredentialDetail(ddo, credentialType, list, credentialAction)
    }
  } else {
    if (exists) {
      ddo.credentials.deny.find((credential) => {
        if (credential.type === credentialType) {
          credential.values = list
        }
      })
    } else {
      ddo = addCredentialDetail(ddo, credentialType, list, credentialAction)
    }
  }
  return ddo
}

/**
 * Adds values to credentials of a certain type for a specific action
 * @param  {ddo} DDO
 * @param {credentialType} CredentialType e.g. address / credential3Box
 * @param {list} string[] list of values
 * @param {credentialAction} CredentialAction allow or deny
 * @return {DDO}
 */

export function addCredentialDetail(
  ddo: DDO,
  credentialType: CredentialType,
  list: string[],
  credentialAction: CredentialAction
) {
  const newCredentialDetail: Credential = {
    type: credentialType,
    value: list
  }
  if (credentialAction === 'allow') {
    if (ddo.credentials && ddo.credentials.allow) {
      ddo.credentials.allow.push(newCredentialDetail)
    } else {
      const newCredentials: Credentials = {
        allow: [newCredentialDetail],
        deny: ddo.credentials && ddo.credentials.deny
      }
      ddo.credentials = newCredentials
    }
  } else {
    if (ddo.credentials && ddo.credentials.deny) {
      ddo.credentials.deny.push(newCredentialDetail)
    } else {
      const newCredential: Credentials = {
        allow: ddo.credentials && ddo.credentials.allow,
        deny: [newCredentialDetail]
      }
      ddo.credentials = newCredential
    }
  }
  return ddo
}
