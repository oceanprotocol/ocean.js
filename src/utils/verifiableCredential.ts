import { Asset } from '../@types'

export const isVerifiableCredential = (asset: Asset): boolean => {
  return (
    (asset as any).type &&
    Array.isArray((asset as any).type) &&
    (asset as any).type.includes('VerifiableCredential')
  )
}
