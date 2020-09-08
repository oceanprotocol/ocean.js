import Config from '../models/Config'

export declare type ConfigHelperNetworkName =
  | 'mainnet'
  | 'rinkeby'
  | 'development'
  | string

export declare type ConfigHelperNetworkId = 1 | 4 | number

export interface ConfigHelperConfig extends Config {
  chainId: ConfigHelperNetworkId
  network: ConfigHelperNetworkName
}

const configs: ConfigHelperConfig[] = [
  {
    chainId: null,
    network: 'development',
    nodeUri: 'http://localhost:8545',
    factoryAddress: null,
    metadataStoreUri: 'http://127.0.0.1:5000',
    providerUri: 'http://127.0.0.1:8030',
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null
  },
  {
    chainId: 4,
    network: 'rinkeby',
    nodeUri: 'https://rinkeby.infura.io/v3',
    factoryAddress: '0x3ECd1429101f93149D799Ef257C07a2B1Dc30897',
    oceanTokenAddress: '0x8967BCF84170c91B0d24D4302C2376283b0B3a07',
    metadataStoreUri: 'https://aquarius.rinkeby.v3.dev-ocean.com',
    providerUri: 'https://provider.rinkeby.v3.dev-ocean.com',
    poolFactoryAddress: '0x9B90A1358fbeEC1C4bB1DA7D4E85C708f87556Ec',
    fixedRateExchangeAddress: '0x991c08bD00761A299d3126a81a985329096896D4'
  },
  {
    chainId: 1,
    network: 'mainnet',
    nodeUri: 'https://mainnet.infura.io/v3',
    factoryAddress: '0x1234',
    oceanTokenAddress: '0x985dd3d42de1e256d09e1c10f112bccb8015ad41',
    metadataStoreUri: null,
    providerUri: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null
  }
]

export class ConfigHelper {
  public getConfig(
    network: ConfigHelperNetworkName | ConfigHelperNetworkId,
    infuraProjectId?: string
  ): ConfigHelperConfig {
    const filterBy = typeof network === 'string' ? 'network' : 'chainId'
    const config = configs.find((c) => c[filterBy] === network)

    const nodeUri = infuraProjectId
      ? `${config.nodeUri}/${infuraProjectId}`
      : config.nodeUri

    return config ? { ...config, nodeUri } : null
  }
}
