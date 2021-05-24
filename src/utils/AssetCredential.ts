import { DDO } from '../ddo/DDO'
import { Credential } from '../ddo/interfaces/Credential'
import { CredentialType } from '../ddo/interfaces/CredentialDetail'

function checkAllowCredentailTypeExist(
  credential: Credential,
  credentialType: CredentialType
): boolean {
  let isExist = false
  if (credential && credential.allow) {
    const allowList = credential.allow.find(
      (credentail) => credentail.type === credentialType
    )
    isExist = allowList.value.length > 0
  }
  return isExist
}

function checkDenyCredentailTypeExist(
  credential: Credential,
  credentialType: CredentialType
): boolean {
  let isExist = false
  if (credential && credential.deny) {
    const dennyList = credential.deny.find(
      (credentail) => credentail.type === credentialType
    )
    isExist = dennyList.value.length > 0
  }
  return isExist
}

export function removeAllowCredentailDetail(
  ddo: DDO,
  cedentialType: CredentialType
): DDO {
  const isAllowCredentailTypeExist = checkAllowCredentailTypeExist(
    ddo.credential,
    cedentialType
  )
  if (isAllowCredentailTypeExist) {
    ddo.credential.allow = ddo.credential.allow.filter(
      (credentail) => credentail.type !== cedentialType
    )
  }
  if (ddo.credential.allow) {
    ddo.credential = {
      deny: ddo.credential.deny
    }
  }
  return ddo
}

export function removeDenyCredentailDetail(ddo: DDO, cedentialType: CredentialType): DDO {
  const isDenyCredentailTypeExist = checkDenyCredentailTypeExist(
    ddo.credential,
    cedentialType
  )
  if (isDenyCredentailTypeExist) {
    ddo.credential.deny = ddo.credential.deny.filter(
      (credentail) => credentail.type !== cedentialType
    )
  }
  if (ddo.credential.deny) {
    ddo.credential = {
      allow: ddo.credential.allow
    }
  }
  return ddo
}

export function updateAllowCredentailDetail(
  ddo: DDO,
  cedentialType: CredentialType,
  allowList: string[]
): DDO {
  const isAllowCredentailTypeExist = checkAllowCredentailTypeExist(
    ddo.credential,
    cedentialType
  )
  if (isAllowCredentailTypeExist) {
    ddo.credential.allow.find((credentail) => {
      if (credentail.type === cedentialType) {
        credentail.value = allowList
      }
    })
  } else {
    addAllowCredentialDetail(ddo, cedentialType, allowList)
  }
  return ddo
}

export function updateDenyCredentailDetail(
  ddo: DDO,
  cedentialType: CredentialType,
  denyList: string[]
): DDO {
  const isDenyCredentailTypeExist = checkDenyCredentailTypeExist(
    ddo.credential,
    cedentialType
  )
  if (isDenyCredentailTypeExist) {
    ddo.credential.deny.find((credentail) => {
      if (credentail.type === cedentialType) {
        credentail.value = denyList
      }
    })
  } else {
    addDenyCredentialDetail(ddo, cedentialType, denyList)
  }
  return ddo
}

function addAllowCredentialDetail(
  ddo: DDO,
  cedentialType: CredentialType,
  allowList: string[]
): DDO {
  if (allowList) {
    ddo.credential.allow = []
    ddo.credential.allow.push(
      {
        type: cedentialType,
        value: allowList
      }
    )
  }
  return ddo
}

function addDenyCredentialDetail(
  ddo: DDO,
  cedentialType: CredentialType,
  denyList: string[]
): DDO {
  if (denyList) {
    ddo.credential.deny = [
      {
        type: cedentialType,
        value: denyList
      }
    ]
  }
  return ddo
}
