import { assert } from 'chai'
import { CredentialType, DDO } from '../../../src/lib'
import {
  removeAllowCredentailDetail,
  removeDenyCredentailDetail,
  updateAllowCredentailDetail,
  updateDenyCredentailDetail
} from '../../../src/utils/AssetCredential'

describe('AssetCredential', () => {
  const addressType = CredentialType.address
  const threeBoxType = CredentialType.credential3Box
  const walletA = '0x12345'
  const walletB = '0x23456'
  const walletC = '0x34567'
  const threeBoxValue = 'did:3:bafyre'
  const ddo = new DDO()

  it('should add allow credential', () => {
    const allowWalletAddressList = [walletA, walletB]
    const newDdo = updateAllowCredentailDetail(ddo, addressType, allowWalletAddressList)
    assert(newDdo.credential.allow.length === 1)
  })

  it('should append allow credential', () => {
    const allowWalletAddressList = [walletA, walletB]
    const allow3BoxList = [threeBoxValue]
    let newDdo = updateAllowCredentailDetail(ddo, addressType, allowWalletAddressList)
    newDdo = updateAllowCredentailDetail(ddo, threeBoxType, allow3BoxList)
    assert(ddo.credential.allow.length === 2)
  })

  it('should add deny credential', () => {
    const denyWalletAddressList = [walletC]
    const newDdo = updateDenyCredentailDetail(ddo, addressType, denyWalletAddressList)
    assert(newDdo.credential.deny.length === 1)
  })

  it('should append deny credential', () => {
    const denyWalletAddressList = [walletC]
    const deny3BoxList = [threeBoxValue]
    let newDdo = updateDenyCredentailDetail(ddo, addressType, denyWalletAddressList)
    newDdo = updateDenyCredentailDetail(ddo, threeBoxType, deny3BoxList)
    assert(ddo.credential.deny.length === 2)
  })

  it('should remove allow credential', () => {
    const allowWalletAddressList = [walletA, walletB]
    let newDdo = updateAllowCredentailDetail(ddo, addressType, allowWalletAddressList)
    newDdo = removeAllowCredentailDetail(ddo, addressType)
    assert(newDdo.credential.allow === undefined)
  })

  it('should remove deny credential', () => {
    const denyWalletAddressList = [walletC]
    let newDdo = updateDenyCredentailDetail(ddo, addressType, denyWalletAddressList)
    newDdo = removeDenyCredentailDetail(ddo, addressType)
    assert(newDdo.credential.deny === undefined)
  })
})
