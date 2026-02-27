import { JsonRpcSigner, Signer, getBytes, ethers } from 'ethers'
import { LoggerInstance } from './Logger'

/**
 * Signs the hash of a message using the provided signer.
 * @param {Signer} signer - The signer to use for signing the hash.
 * @param {string} message - The message to sign.
 * @returns {Promise<string>} - A Promise that resolves to the signature of the hash of the message.
 */
export async function signHash(signer: Signer, message: string) {
  // Since ganache has no support yet for personal_sign, we must use the legacy implementation
  // const signedMessage = await user2.signMessage(message)

  const messageHashBytes = getBytes(message)
  let signedMessage = await (signer as JsonRpcSigner)._legacySignMessage(messageHashBytes)
  signedMessage = signedMessage.substr(2) // remove 0x
  const r = '0x' + signedMessage.slice(0, 64)
  const s = '0x' + signedMessage.slice(64, 128)
  let v = '0x' + signedMessage.slice(128, 130)
  if (v === '0x00') v = '0x1b'
  if (v === '0x01') v = '0x1c'

  return { v, r, s }
}

export async function signRequest(signer: Signer, message: string): Promise<string> {
  const consumerMessage = ethers.solidityPackedKeccak256(
    ['bytes'],
    [ethers.hexlify(ethers.toUtf8Bytes(message))]
  )
  const messageHashBytes = ethers.toBeArray(consumerMessage)
  try {
    return await signer.signMessage(messageHashBytes)
  } catch (error) {
    // LoggerInstance.error('Sign message error: ', error)
    const network = await signer.provider.getNetwork()
    const chainId = Number(network.chainId)
    if (Number(chainId) === 8996) {
      console.log('Signing message with _legacySignMessage')
      return await (signer as JsonRpcSigner)._legacySignMessage(messageHashBytes)
    }
  }
}
