import { Config, LogLevel } from '../../src/models/Config'
import { LoggerInstance } from '../../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

const Web3 = require('web3')
const web3 = new Web3('http://127.0.0.1:8545')

export default {
    metadataStoreUri: 'http://localhost:5000',
    providerUri: 'http://localhost:8030',
    nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
    verbose: LogLevel.Error,
    web3Provider: web3
} as Config
