import { Config, LogLevel } from '../../src/models/Config'
import { LoggerInstance } from '../../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

export default {
    // metadataStoreUri: 'http://localhost:5000',
    metadataStoreUri: 'https://aquarius.marketplace.dev-ocean.com',
    providerUri: 'http://localhost:8030',
    nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
    parityUri: 'http://localhost:9545',
    secretStoreUri: 'http://localhost:12001',
    verbose: LogLevel.Error,
    web3Provider: web3
} as Config

// export PROVIDER_ADDRESS=0x94aeb88c9C7B933D131CAF4571eab7eE1Cb35e1D
// export PROVIDER_KEY=0x87e6661e4846e29dc478148f33899aea068e1da5996fe13e1dc64d675c06922f