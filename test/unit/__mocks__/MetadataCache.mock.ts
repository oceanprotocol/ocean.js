import { MetadataCache } from '../../../src/metadatacache/MetadataCache'
import { DDO } from '../../../src/ddo/DDO'
import DID from '../../../src/ocean/DID'

const ddoStore: Map<string, any> = new Map<string, any>()

export default class MetadataCacheMock extends MetadataCache {
  public async getAccessUrl(accessToken: any, payload: any): Promise<string> {
    return 'http://test/test'
  }

  public async storeDDO(ddo: DDO): Promise<DDO> {
    ddoStore.set(ddo.id, ddo)
    return ddo
  }

  public async retrieveDDO(did: DID): Promise<DDO> {
    return ddoStore.get(did.getDid())
  }
}
