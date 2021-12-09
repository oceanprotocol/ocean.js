import Config from '../models/Config'
import fs from 'fs'
import { homedir } from 'os'
// eslint-disable-next-line import/no-named-default
import { default as DefaultContractsAddresses } from '@oceanprotocol/contracts/addresses/address.json'
import LoggerInstance from './Logger'

const configHelperNetworksBase: Config = {
  chainId: null,
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
  startBlock: 0
}

export const configHelperNetworks: Config[] = [
  {
    ...configHelperNetworksBase
  },
  {
    // barge
    ...configHelperNetworksBase,
    chainId: 8996,
    network: 'development',
    metadataCacheUri: 'http://127.0.0.1:5000'
  },
  {
    ...configHelperNetworksBase,
    chainId: 3,
    network: 'ropsten',
    nodeUri: 'https://ropsten.infura.io/v3',
    providerUri: 'https://provider.ropsten.oceanprotocol.com',
    subgraphUri: 'https://subgraph.ropsten.oceanprotocol.com',
    explorerUri: 'https://ropsten.etherscan.io',
    startBlock: 9227563
  },
  {
    ...configHelperNetworksBase,
    chainId: 4,
    network: 'rinkeby',
    nodeUri: 'https://rinkeby.infura.io/v3',
    providerUri: 'https://provider.rinkeby.oceanprotocol.com',
    subgraphUri: 'https://subgraph.rinkeby.oceanprotocol.com',
    explorerUri: 'https://rinkeby.etherscan.io',
    startBlock: 7294090
  },
  {
    ...configHelperNetworksBase,
    chainId: 1,
    network: 'mainnet',
    nodeUri: 'https://mainnet.infura.io/v3',
    providerUri: 'https://provider.mainnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mainnet.oceanprotocol.com',
    explorerUri: 'https://etherscan.io',
    startBlock: 11105459
  },
  {
    ...configHelperNetworksBase,
    chainId: 137,
    network: 'polygon',
    nodeUri: 'https://polygon-mainnet.infura.io/v3',
    providerUri: 'https://provider.polygon.oceanprotocol.com',
    subgraphUri: 'https://subgraph.polygon.oceanprotocol.com',
    explorerUri: 'https://polygonscan.com',
    oceanTokenSymbol: 'mOCEAN',
    startBlock: 11005222
  },
  {
    ...configHelperNetworksBase,
    chainId: 1287,
    network: 'moonbeamalpha',
    nodeUri: 'https://rpc.testnet.moonbeam.network',
    providerUri: 'https://provider.moonbeamalpha.oceanprotocol.com',
    subgraphUri: 'https://subgraph.moonbeamalpha.oceanprotocol.com',
    explorerUri: 'https://moonbase-blockscout.testnet.moonbeam.network/',
    startBlock: 90707
  },
  {
    ...configHelperNetworksBase,
    chainId: 2021000,
    network: 'gaiaxtestnet',
    nodeUri: 'https://rpc.gaiaxtestnet.oceanprotocol.com',
    providerUri: 'https://provider.gaiaxtestnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.gaiaxtestnet.oceanprotocol.com',
    explorerUri: 'https://blockscout.gaiaxtestnet.oceanprotocol.com'
  },
  {
    ...configHelperNetworksBase,
    chainId: 2021001,
    network: 'catenaxtestnet',
    nodeUri: 'https://rpc.catenaxtestnet.oceanprotocol.com',
    providerUri: 'https://provider.catenaxtestnet.oceanprotocol.com',
    subgraphUri: 'https://subgraph.catenaxtestnet.oceanprotocol.com',
    explorerUri: 'https://blockscout.catenaxtestnet.oceanprotocol.com',
    metadataCacheUri: 'https://aquarius.catenaxtestnet.oceanprotocol.com'
  },
  {
    ...configHelperNetworksBase,
    chainId: 80001,
    network: 'mumbai',
    nodeUri: 'https://polygon-mumbai.infura.io/v3',
    providerUri: 'https://provider.mumbai.oceanprotocol.com',
    subgraphUri: 'https://subgraph.mumbai.oceanprotocol.com',
    explorerUri: 'https://mumbai.polygonscan.com'
  },
  {
    ...configHelperNetworksBase,
    chainId: 56,
    network: 'bsc',
    nodeUri: 'https://bsc-dataseed.binance.org',
    providerUri: 'https://provider.bsc.oceanprotocol.com',
    subgraphUri: 'https://subgraph.bsc.oceanprotocol.com',
    explorerUri: 'https://bscscan.com/'
  },
  {
    ...configHelperNetworksBase,
    chainId: 44787,
    network: 'celoalfajores',
    nodeUri: 'https://alfajores-forno.celo-testnet.org',
    providerUri: 'https://provider.celoalfajores.oceanprotocol.com',
    subgraphUri: 'https://subgraph.celoalfajores.oceanprotocol.com',
    explorerUri: 'https://alfajores-blockscout.celo-testnet.org'
  },
  {
    ...configHelperNetworksBase,
    chainId: 246,
    network: 'energyweb',
    nodeUri: 'https://rpc.energyweb.org',
    providerUri: 'https://provider.energyweb.oceanprotocol.com',
    subgraphUri: 'https://subgraph.energyweb.oceanprotocol.com',
    explorerUri: 'https://explorer.energyweb.org'
  },
  {
    ...configHelperNetworksBase,
    chainId: 1285,
    network: 'moonriver',
    nodeUri: 'https://moonriver.api.onfinality.io/public',
    providerUri: 'https://provider.moonriver.oceanprotocol.com',
    subgraphUri: 'https://subgraph.moonriver.oceanprotocol.com',
    explorerUri: 'https://blockscout.moonriver.moonbeam.network'
  }
]

export class ConfigHelper {
  /* Load contract addresses from env ADDRESS_FILE (generated by ocean-contracts) */
  public getAddressesFromEnv(network: string): Partial<Config> {
    // use the defaults first
    let configAddresses: Partial<Config>
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
        chainId: chainId,
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
          chainId: chainId,
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
    const filterBy = typeof network === 'string' ? 'network' : 'chainId'
    let config = configHelperNetworks.find((c) => c[filterBy] === network)

    if (!config) {
      LoggerInstance.error(`No config found for given network '${network}'`)
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
