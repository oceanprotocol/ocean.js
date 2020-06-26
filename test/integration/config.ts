import { Config, LogLevel } from '../../src/models/Config'
import { LoggerInstance } from '../../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

export default {
    // metadataStoreUri: 'http://localhost:5000',
    metadataStoreUri: 'https://aquarius.marketplace.dev-ocean.com',
    providerUri: 'http://127.0.0.1:8030',
    nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
    parityUri: 'http://localhost:9545',
    secretStoreUri: 'http://localhost:12001',
    verbose: LogLevel.Error,
    web3Provider: web3
} as Config
