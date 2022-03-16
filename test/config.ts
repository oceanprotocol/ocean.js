import Web3 from 'web3'
import fs from 'fs'
import { homedir } from 'os'
import {
  ConfigHelper,
  configHelperNetworks,
  LoggerInstance,
  LogLevel
} from '../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

// by default, we connect with development network
export const web3 = new Web3(process.env.NODE_URI || configHelperNetworks[1].nodeUri)

export const getTestConfig = async (web3: Web3) => {
  return new ConfigHelper().getConfig(await web3.eth.getChainId())
}

export const getAddresses = () => {
  const data = JSON.parse(
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFileSync(
      process.env.ADDRESS_FILE ||
        `${homedir}/.ocean/ocean-contracts/artifacts/address.json`,
      'utf8'
    )
  )
  return data.development
}
