import { DDO } from '../ddo/DDO'
import {
  Credentials,
  Credential,
  CredentialType,
  CredentialAction
} from '../ddo/interfaces/Credentials'

export function checkCredentialExist(
  credentials: Credentials,
  credentialType: CredentialType,
  credentialAction: CredentialAction
): boolean {
  let isExist = false
  if (credentialAction === 'allow') {
    if (credentials && credentials.allow) {
      const allowList = credentials.allow.find(
        (credentail) => credentail.type === credentialType
      )
      isExist = allowList && allowList.value.length > 0
    }
    return isExist
  } else {
    if (credentials && credentials.deny) {
      const dennyList = credentials.deny.find(
        (credentail) => credentail.type === credentialType
      )
      isExist = dennyList && dennyList.value.length > 0
    }
    return isExist
  }
}

export function removeCredentialDetail(
  ddo: DDO,
  credentialType: CredentialType,
  credentialAction: CredentialAction
): DDO {
  const exists = this.checkCredentialExist(
    ddo.credentials,
    credentialType,
    credentialAction
  )
  if (credentialAction === 'allow') {
    if (exists) {
      ddo.credentials.allow = ddo.credentials.allow.filter(
        (credentail) => credentail.type !== credentialType
      )
    }
    if (!ddo.credentials.allow) {
      ddo.credentials = {
        deny: ddo.credentials.deny
      }
    }
  } else {
    if (exists) {
      ddo.credentials.deny = ddo.credentials.deny.filter(
        (credential) => credential.type !== credentialType
      )
    }
    if (!ddo.credentials.deny) {
      ddo.credentials = {
        allow: ddo.credentials.allow
      }
    }
  }
  return ddo
}

export function updateCredentialDetail(
  ddo: DDO,
  credentialType: CredentialType,
  list: string[],
  credentialAction: CredentialAction
): DDO {
  const exists = this.checkCredentialExist(
    ddo.credentials,
    credentialType,
    credentialAction
  )
  if (credentialAction === 'allow') {
    if (exists) {
      ddo.credentials.allow.find((credentail) => {
        if (credentail.type === credentialType) {
          credentail.value = list
        }
      })
    } else {
      return this.addCredentialDetail(ddo, credentialType, list, credentialAction)
    }
  } else {
    if (exists) {
      ddo.credentials.deny.find((credentail) => {
        if (credentail.type === credentialType) {
          credentail.value = list
        }
      })
    } else {
      return this.addCredentialDetail(ddo, credentialType, list, credentialAction)
    }
  }
  return ddo
}

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
