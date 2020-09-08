import { Config } from '../../src/models/Config'
import { LoggerInstance, LogLevel } from '../../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

export default {
  metadataStoreUri: 'http://localhost:5000',
  providerUri: 'http://localhost:8030',
  nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
  parityUri: 'http://localhost:9545',
  secretStoreUri: 'http://localhost:12001',
  verbose: LogLevel.Error
} as Config
