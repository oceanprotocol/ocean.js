import Config from '../models/Config'
import fs from 'fs'
import { homedir } from 'os'
// eslint-disable-next-line import/no-named-default
import { default as DefaultContractsAddresses } from '@oceanprotocol/contracts/artifacts/address.json'
import Logger from './Logger'

export declare type ConfigHelperNetworkName =
  | 'mainnet'
  | 'rinkeby'
  | 'development'
  | string

export declare type ConfigHelperNetworkId = 1 | 4 | number

export interface ConfigHelperConfig extends Config {
  networkId: ConfigHelperNetworkId
  network: ConfigHelperNetworkName
  subgraphUri: string
  explorerUri: string
  oceanTokenSymbol: string
}

export const configHelperNetworks: ConfigHelperConfig[] = [
  {
    networkId: null,
    network: 'unknown',
    nodeUri: 'http://localhost:8545',
    metadataCacheUri: 'http://127.0.0.1:5000',
    providerUri: 'http://127.0.0.1:8030',
    subgraphUri: null,
    explorerUri: null,
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: '0x1234',
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 0
  },
  {
    // barge
    networkId: 8996,
    network: 'development',
    nodeUri: 'http://localhost:8545',
    metadataCacheUri: 'http://127.0.0.1:5000',
    providerUri: 'http://127.0.0.1:8030',
    subgraphUri: null,
    explorerUri: null,
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 0
  },
  {
    networkId: 3,
    network: 'ropsten',
    nodeUri: 'https://ropsten.infura.io/v3',
    metadataCacheUri: 'https://aquarius.ropsten.oceanprotocol.com',
    providerUri: 'https://provider.ropsten.oceanprotocol.com',
    subgraphUri: 'https://subgraph.ropsten.oceanprotocol.com',
    explorerUri: 'https://ropsten.etherscan.io',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 9227563
  },
  {
    networkId: 4,
    network: 'rinkeby',
    nodeUri: 'https://rinkeby.infura.io/v3',
    metadataCacheUri: 'https://aquarius.rinkeby.oceanprotocol.com',
    providerUri: 'https://provider.rinkeby.oceanprotocol.com',
    subgraphUri: 'https://subgraph.rinkeby.oceanprotocol.com',
    explorerUri: 'https://rinkeby.etherscan.io',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 7294090
  },
  {
    networkId: 1,
    network: 'mainnet',
    nodeUri: 'https://mainnet.infura.io/v3',
    metadataCacheUri: 'https://aquarius.mainnet.oceanprotocol.com',
    providerUri: 'https://provider.mainnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mainnet.oceanprotocol.com',
    explorerUri: 'https://etherscan.io',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 11105459
  },
  {
    networkId: 137,
    network: 'polygon',
    nodeUri: 'https://rpc-mainnet.maticvigil.com/',
    metadataCacheUri: 'https://aquarius.polygon.oceanprotocol.com',
    providerUri: 'https://provider.polygon.oceanprotocol.com',
    subgraphUri: 'https://subgraph.polygon.oceanprotocol.com',
    explorerUri: 'https://explorer.matic.network',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'mOCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 11005222
  },
  {
    networkId: 1287,
    network: 'moonbeamalpha',
    nodeUri: 'https://rpc.testnet.moonbeam.network/',
    metadataCacheUri: 'https://aquarius.moonbeamalpha.oceanprotocol.com',
    providerUri: 'https://provider.moonbeamalpha.oceanprotocol.com',
    subgraphUri: 'https://subgraph.moonbeamalpha.oceanprotocol.com',
    explorerUri: 'https://moonbase-blockscout.testnet.moonbeam.network/',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 90707
  },
  {
    networkId: 2021000,
    network: 'gaiaxtestnet',
    nodeUri: 'https://gaia-x.rpc',
    metadataCacheUri: 'https://aquarius.gaiaxtestnet.oceanprotocol.com',
    providerUri: 'https://provider.gaiaxtestnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.gaiaxtestnet.oceanprotocol.com',
    explorerUri: 'https://gaiaxtestnet.explorer',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 0
  },
  {
    networkId: 80001,
    network: 'mumbai',
    nodeUri: 'https://polygon-mumbai.infura.io/v3/',
    metadataCacheUri: 'https://aquarius.mumbai.oceanprotocol.com',
    providerUri: 'https://provider.mumbai.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mumbai.oceanprotocol.com',
    explorerUri: 'https://explorer-mumbai.maticvigil.com/',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 0
  },
  {
    networkId: 56,
    network: 'bsc',
    nodeUri: 'https://bsc-dataseed.binance.org/',
    metadataCacheUri: 'https://aquarius.bsc.oceanprotocol.com',
    providerUri: 'https://provider.bsc.oceanprotocol.com',
    subgraphUri: 'https://subgraph.bsc.oceanprotocol.com',
    explorerUri: 'https://bscscan.com/',
    oceanTokenAddress: null,
    oceanTokenSymbol: 'OCEAN',
    factoryAddress: null,
    poolFactoryAddress: null,
    fixedRateExchangeAddress: null,
    dispenserAddress: null,
    metadataContractAddress: null,
    startBlock: 0
  }
]

export class ConfigHelper {
  /* Load contract addresses from env ADDRESS_FILE (generated by ocean-contracts) */
  public getAddressesFromEnv(network: string): Partial<ConfigHelperConfig> {
    // use the defaults first
    let configAddresses: Partial<ConfigHelperConfig>
    if (DefaultContractsAddresses[network]) {
      const {
        DTFactory,
        BFactory,
        FixedRateExchange,
        Dispenser,
        Metadata,
        Ocean,
        chainId,
        startBlock
      } = DefaultContractsAddresses[network]
      configAddresses = {
        factoryAddress: DTFactory,
        poolFactoryAddress: BFactory,
        fixedRateExchangeAddress: FixedRateExchange,
        dispenserAddress: Dispenser,
        metadataContractAddress: Metadata,
        oceanTokenAddress: Ocean,
        networkId: chainId,
        startBlock: startBlock,
        ...(process.env.AQUARIUS_URI && { metadataCacheUri: process.env.AQUARIUS_URI })
      }
    }
    // try ADDRESS_FILE env
    if (fs && process.env.ADDRESS_FILE) {
      try {
        const data = JSON.parse(
          fs.readFileSync(
            process.env.ADDRESS_FILE ||
              `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
            'utf8'
          )
        )
        const {
          DTFactory,
          BFactory,
          FixedRateExchange,
          Dispenser,
          Metadata,
          Ocean,
          chainId,
          startBlock
        } = data[network]
        configAddresses = {
          factoryAddress: DTFactory,
          poolFactoryAddress: BFactory,
          fixedRateExchangeAddress: FixedRateExchange,
          dispenserAddress: Dispenser,
          metadataContractAddress: Metadata,
          oceanTokenAddress: Ocean,
          networkId: chainId,
          startBlock: startBlock,
          ...(process.env.AQUARIUS_URI && { metadataCacheUri: process.env.AQUARIUS_URI })
        }
      } catch (e) {
        // console.error(`ERROR: Could not load local contract address file: ${e.message}`)
        // return null
      }
    }
    return configAddresses
  }

  public getConfig(
    network: ConfigHelperNetworkName | ConfigHelperNetworkId,
    infuraProjectId?: string
  ): Config {
    const filterBy = typeof network === 'string' ? 'network' : 'networkId'
    let config = configHelperNetworks.find((c) => c[filterBy] === network)

    if (!config) {
      Logger.error(`No config found for given network '${network}'`)
      return null
    }

    const contractAddressesConfig = this.getAddressesFromEnv(config.network)
    config = { ...config, ...contractAddressesConfig }

    const nodeUri = infuraProjectId
      ? `${config.nodeUri}/${infuraProjectId}`
      : config.nodeUri

    return { ...config, nodeUri }
  }
}
