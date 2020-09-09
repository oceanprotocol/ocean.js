export interface ConfigHelper {
  chainId?: number
  network: string
  url: string
  factoryAddress: string
  poolFactoryAddress: string
  oceanTokenAddress: string
  metadataStoreUri: string
  providerUri: string
  fixedRateExchangeAddress: string
}

const configs = [
  {
    chaindId: null,
    network: 'development',
    url: 'http://localhost:8545',
    factoryAddress: null,
    metadataStoreUri: 'http://127.0.0.1:5000',
    providerUri: 'http://127.0.0.1:8030',
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null
  },
  {
    chainId: 4,
    network: 'rinkeby',
    url: 'https://rinkeby.infura.io/v3',
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
    url: 'https://mainnet.infura.io/v3',
    factoryAddress: '0x1234',
    oceanTokenAddress: '0x985dd3d42de1e256d09e1c10f112bccb8015ad41',
    metadataStoreUri: null,
    providerUri: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null
  }
]

export class ConfigHelper {
  public getConfig(network: string, infuraProjectId?: string): ConfigHelper {
    const confighelp = new ConfigHelper()
    // fill unknown values
    confighelp.chainId = null
    confighelp.factoryAddress = null
    confighelp.url = null
    confighelp.network = network
    confighelp.oceanTokenAddress = null
    confighelp.metadataStoreUri = null
    confighelp.providerUri = null
    confighelp.poolFactoryAddress = null
    confighelp.fixedRateExchangeAddress = null

    const knownconfig = configs.find((c) => c.network === network)

    if (knownconfig) {
      confighelp.chainId = knownconfig.chainId
      confighelp.factoryAddress = knownconfig.factoryAddress
      confighelp.oceanTokenAddress = knownconfig.oceanTokenAddress
      confighelp.url = `${knownconfig.url}/${infuraProjectId}`
      confighelp.network = knownconfig.network
      confighelp.metadataStoreUri = knownconfig.metadataStoreUri
      confighelp.providerUri = knownconfig.providerUri
      confighelp.poolFactoryAddress = knownconfig.poolFactoryAddress
      confighelp.fixedRateExchangeAddress = knownconfig.fixedRateExchangeAddress
    }

    return confighelp
  }

  public getConfigById(chainId: number, infuraProjectId?: string): ConfigHelper {
    const confighelp = new ConfigHelper()
    // fill unknown values
    confighelp.chainId = chainId
    confighelp.factoryAddress = null
    confighelp.url = null
    confighelp.network = null
    confighelp.oceanTokenAddress = null
    confighelp.metadataStoreUri = null
    confighelp.providerUri = null
    confighelp.poolFactoryAddress = null

    const knownconfig = configs.find((c) => c.chainId === chainId)

    if (knownconfig) {
      confighelp.chainId = knownconfig.chainId
      confighelp.factoryAddress = knownconfig.factoryAddress
      confighelp.oceanTokenAddress = knownconfig.oceanTokenAddress
      confighelp.url = `${knownconfig.url}/${infuraProjectId}`
      confighelp.network = knownconfig.network
      confighelp.metadataStoreUri = knownconfig.metadataStoreUri
      confighelp.providerUri = knownconfig.providerUri
      confighelp.poolFactoryAddress = knownconfig.poolFactoryAddress
      confighelp.fixedRateExchangeAddress = knownconfig.fixedRateExchangeAddress
    }

    return confighelp
  }
}
