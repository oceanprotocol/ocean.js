import jwt from 'jsonwebtoken'
import { JwtPayload } from '../@types/Jwt.js'

export function decodeJwt(token: string): JwtPayload {
  try {
    const decoded = jwt.decode(token, { json: true })
    // jwt.decode returns null for a malformed token (it does not throw). Reject that rather than
    // casting null through as a JwtPayload. Older tokens that merely omit the newer optional claims
    // still decode to a valid object (address/nonce/createdAt present) and pass.
    if (!decoded || typeof decoded !== 'object') {
      throw new Error('Invalid JWT payload')
    }
    // `address` is required on every token (JwtPayload declares it non-optional) and is read directly
    // by callers (getConsumerAddress). Reject a payload whose address is not a string rather than
    // letting `undefined` flow downstream. Signature verification stays the node's job.
    if (typeof (decoded as JwtPayload).address !== 'string') {
      throw new Error('Invalid JWT payload')
    }
    return decoded as JwtPayload
  } catch {
    throw new Error('Error decoding JWT')
  }
}
