import { BaseProvider } from './providers/BaseProvider.js'
export {
  BaseProvider as Provider,
  isP2pUri,
  OCEAN_P2P_PROTOCOL
} from './providers/BaseProvider.js'

export const ProviderInstance = new BaseProvider()
