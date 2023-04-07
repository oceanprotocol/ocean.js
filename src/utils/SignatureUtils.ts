import { ethers, Signer, providers } from 'ethers'

/**
 * Signs the hash of a message using the provided signer.
 * @param {Signer} signer - The signer to use for signing the hash.
 * @param {string} message - The message to sign.
 * @returns {Promise<string>} - A Promise that resolves to the signature of the hash of the message.
 */
export async function signHash(signer: Signer, message: string) {
  // Since ganache has no support yet for personal_sign, we must use the legacy implementation
  // const signedMessage = await user2.signMessage(message)

  const messageHashBytes = ethers.utils.arrayify(message)
  let signedMessage = await (signer as providers.JsonRpcSigner)._legacySignMessage(
    messageHashBytes
  )
  signedMessage = signedMessage.substr(2) // remove 0x
  const r = '0x' + signedMessage.slice(0, 64)
  const s = '0x' + signedMessage.slice(64, 128)
  let v = '0x' + signedMessage.slice(128, 130)
  if (v === '0x00') v = '0x1b'
  if (v === '0x01') v = '0x1c'

  return { v, r, s }
}
