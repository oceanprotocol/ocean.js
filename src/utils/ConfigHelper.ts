import Config from '../models/Config'
import fs from 'fs'
import { homedir } from 'os'
// eslint-disable-next-line import/no-named-default
import { default as DefaultContractsAddresses } from '@oceanprotocol/contracts/artifacts/address.json'
import Logger from './Logger'

export interface ConfigHelperConfig extends Config {
  networkId: number
  network: string
  subgraphUri: string
  explorerUri: string
  oceanTokenSymbol: string
  transactionBlockTimeout: number
  transactionConfirmationBlocks: number
  transactionPollingTimeout: number
  gasFeeMultiplier: number
}

const configHelperNetworksBase: ConfigHelperConfig = {
  networkId: null,
  network: 'unknown',
  metadataCacheUri: 'https://aquarius.oceanprotocol.com',
  nodeUri: 'http://localhost:8545',
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
  startBlock: 0,
  transactionBlockTimeout: 50,
  transactionConfirmationBlocks: 1,
  transactionPollingTimeout: 750,
  gasFeeMultiplier: 1
}

export const configHelperNetworks: ConfigHelperConfig[] = [
  {
    ...configHelperNetworksBase
  },
  {
    // barge
    ...configHelperNetworksBase,
    networkId: 8996,
    network: 'development',
    metadataCacheUri: 'http://127.0.0.1:5000',
    rbacUri: 'http://127.0.0.1:3000'
  },
  {
    ...configHelperNetworksBase,
    networkId: 3,
    network: 'ropsten',
    nodeUri: 'https://ropsten.infura.io/v3',
    providerUri: 'https://provider.ropsten.oceanprotocol.com',
    subgraphUri: 'https://subgraph.ropsten.oceanprotocol.com',
    explorerUri: 'https://ropsten.etherscan.io',
    startBlock: 9227563
  },
  {
    ...configHelperNetworksBase,
    networkId: 4,
    network: 'rinkeby',
    nodeUri: 'https://rinkeby.infura.io/v3',
    providerUri: 'https://provider.rinkeby.oceanprotocol.com',
    subgraphUri: 'https://subgraph.rinkeby.oceanprotocol.com',
    explorerUri: 'https://rinkeby.etherscan.io',
    startBlock: 7294090
  },
  {
    ...configHelperNetworksBase,
    networkId: 1,
    network: 'mainnet',
    nodeUri: 'https://mainnet.infura.io/v3',
    providerUri: 'https://provider.mainnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mainnet.oceanprotocol.com',
    explorerUri: 'https://etherscan.io',
    startBlock: 11105459,
    transactionBlockTimeout: 150,
    transactionConfirmationBlocks: 5,
    transactionPollingTimeout: 1750,
    gasFeeMultiplier: 1.05
  },
  {
    ...configHelperNetworksBase,
    networkId: 137,
    network: 'polygon',
    nodeUri: 'https://polygon-mainnet.infura.io/v3',
    providerUri: 'https://provider.polygon.oceanprotocol.com',
    subgraphUri: 'https://subgraph.polygon.oceanprotocol.com',
    explorerUri: 'https://polygonscan.com',
    oceanTokenSymbol: 'mOCEAN',
    startBlock: 11005222,
    gasFeeMultiplier: 1.05
  },
  {
    ...configHelperNetworksBase,
    networkId: 1287,
    network: 'moonbeamalpha',
    nodeUri: 'https://rpc.testnet.moonbeam.network',
    providerUri: 'https://provider.moonbeamalpha.oceanprotocol.com',
    subgraphUri: 'https://subgraph.moonbeamalpha.oceanprotocol.com',
    explorerUri: 'https://moonbase-blockscout.testnet.moonbeam.network/',
    startBlock: 90707
  },
  {
    ...configHelperNetworksBase,
    networkId: 2021000,
    network: 'gaiaxtestnet',
    nodeUri: 'https://rpc.gaiaxtestnet.oceanprotocol.com',
    providerUri: 'https://provider.gaiaxtestnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.gaiaxtestnet.oceanprotocol.com',
    explorerUri: 'https://blockscout.gaiaxtestnet.oceanprotocol.com'
  },
  {
    ...configHelperNetworksBase,
    networkId: 2021001,
    network: 'catenaxtestnet',
    nodeUri: 'https://rpc.catenaxtestnet.oceanprotocol.com',
    providerUri: 'https://provider.catenaxtestnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.catenaxtestnet.oceanprotocol.com',
    explorerUri: 'https://blockscout.catenaxtestnet.oceanprotocol.com',
    metadataCacheUri: 'https://aquarius.catenaxtestnet.oceanprotocol.com'
  },
  {
    ...configHelperNetworksBase,
    networkId: 80001,
    network: 'mumbai',
    nodeUri: 'https://polygon-mumbai.infura.io/v3',
    providerUri: 'https://provider.mumbai.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mumbai.oceanprotocol.com',
    explorerUri: 'https://mumbai.polygonscan.com'
  },
  {
    ...configHelperNetworksBase,
    networkId: 56,
    network: 'bsc',
    nodeUri: 'https://bsc-dataseed.binance.org',
    providerUri: 'https://provider.bsc.oceanprotocol.com',
    subgraphUri: 'https://subgraph.bsc.oceanprotocol.com',
    explorerUri: 'https://bscscan.com/',
    gasFeeMultiplier: 1.05
  },
  {
    ...configHelperNetworksBase,
    networkId: 44787,
    network: 'celoalfajores',
    nodeUri: 'https://alfajores-forno.celo-testnet.org',
    providerUri: 'https://provider.celoalfajores.oceanprotocol.com',
    subgraphUri: 'https://subgraph.celoalfajores.oceanprotocol.com',
    explorerUri: 'https://alfajores-blockscout.celo-testnet.org'
  },
  {
    ...configHelperNetworksBase,
    networkId: 246,
    network: 'energyweb',
    nodeUri: 'https://rpc.energyweb.org',
    providerUri: 'https://provider.energyweb.oceanprotocol.com',
    subgraphUri: 'https://subgraph.energyweb.oceanprotocol.com',
    explorerUri: 'https://explorer.energyweb.org',
    gasFeeMultiplier: 1.05
  },
  {
    ...configHelperNetworksBase,
    networkId: 1285,
    network: 'moonriver',
    nodeUri: 'https://moonriver.api.onfinality.io/public',
    providerUri: 'https://provider.moonriver.oceanprotocol.com',
    subgraphUri: 'https://subgraph.moonriver.oceanprotocol.com',
    explorerUri: 'https://blockscout.moonriver.moonbeam.network',
    gasFeeMultiplier: 1.05
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

  public getConfig(network: string | number, infuraProjectId?: string): Config {
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
