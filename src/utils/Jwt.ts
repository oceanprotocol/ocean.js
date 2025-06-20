import jwt from 'jsonwebtoken'
import { JwtPayload } from '../@types/Jwt'

export function decodeJwt(token: string): JwtPayload {
  try {
    const decoded = jwt.decode(token, { json: true })
    return decoded as JwtPayload
  } catch (error) {
    throw new Error('Error decoding JWT')
  }
}
