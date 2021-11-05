import { Config } from '../../src/models/Config'
import { LoggerInstance, LogLevel } from '../../src/utils'

import Web3 from 'web3'

LoggerInstance.setLevel(LogLevel.Error)
const web3 = new Web3('http://127.0.0.1:8545')

export default {
  metadataCacheUri: 'http://aquarius:5000',
  providerUri: 'http://localhost:8030',
  nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
  verbose: LogLevel.Error,
  web3Provider: web3,
  rbacUri: 'http://localhost:3000'
} as Config
