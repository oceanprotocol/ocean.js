import { Config } from '../../src/models/Config'

import Web3 from 'web3'

const web3 = new Web3('http://127.0.0.1:8545')

export default {
  metadataCacheUri: 'http://aquarius:5000',
  providerUri: 'http://localhost:8030',
  nodeUri: `http://localhost:${process.env.ETH_PORT || 8545}`,
  web3Provider: web3
} as Config
