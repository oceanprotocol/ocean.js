import { DDO_V4 } from './DDO_V4'
import { VerifiableCredential } from './VerifiableCredential'

type AssetType = DDO_V4 | VerifiableCredential

export class DDOFactory {
  static createDDO(data: any): AssetType {
    const { version } = data
    switch (version) {
      case '4.1.0':
      case '4.3.0':
      case '4.5.0':
      case '4.7.0':
        return new DDO_V4(data)

      case '5.0.0':
        return new VerifiableCredential(data)

      default:
        throw new Error(`Unsupported DDO version: ${version}`)
    }
  }
}
