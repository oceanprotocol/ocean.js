import Web3 from 'web3'

export async function signHash(web3: Web3, message: string, address: string) {
  let signedMessage = await web3.eth.sign(message, address)
  signedMessage = signedMessage.substr(2) // remove 0x
  const r = '0x' + signedMessage.slice(0, 64)
  const s = '0x' + signedMessage.slice(64, 128)
  let v = '0x' + signedMessage.slice(128, 130)
  // make sure we obey 27 and 28 standards
  if (v === '0x00') v = '0x1b'
  if (v === '0x01') v = '0x1c'
  return { v, r, s }
}
