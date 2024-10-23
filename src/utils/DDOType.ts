import { DDOFactory } from './DDO/DdoFactory'

export async function getDDOType(assetData: any) {
  return DDOFactory.createDDO(assetData)
}
