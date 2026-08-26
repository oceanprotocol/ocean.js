import { BaseProvider } from './providers/BaseProvider.js'
export {
  BaseProvider as Provider,
  isP2pUri,
  OCEAN_P2P_PROTOCOL,
  type P2PConfig,
  // `getProvidersForString`'s return type, plus the element type of its `multiaddrs`
  // field. Both were reachable only inside the emitted .d.ts, so a consumer could see
  // them in the signature but had no name to import.
  type P2pProviderRecord,
  type Multiaddr
} from './providers/BaseProvider.js'

export const ProviderInstance = new BaseProvider()
