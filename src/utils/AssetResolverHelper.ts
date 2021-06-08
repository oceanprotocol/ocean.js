import { DDO } from '../ddo/DDO'
import { Ocean } from '../ocean/Ocean'

export interface AssetResolver {
  did: string
  ddo: DDO
}

function isDdo(arg: any): arg is DDO {
  return arg.id !== undefined
}

export async function assetResolve(
  asset: DDO | string,
  ocean: Ocean
): Promise<AssetResolver> {
  if (isDdo(asset)) {
    const did = asset.id
    const ddo = asset
    return { did, ddo }
  } else {
    const ddo = await ocean.assets.resolve(asset)
    const did = ddo.id
    return { did, ddo }
  }
}
