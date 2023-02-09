import Web3 from 'web3'
import { ethers, Wallet, JsonRpcProvider, Signer } from 'ethers'
import fs from 'fs'
import { homedir } from 'os'
import { ConfigHelper, configHelperNetworks } from '../src/config'
import { LoggerInstance, LogLevel } from '../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

export const GAS_PRICE = '3000000000'

// by default, we connect with development network
export const web3 = new Web3(process.env.NODE_URI || configHelperNetworks[1].nodeUri)

export const provider = new JsonRpcProvider(
  process.env.NODE_URI || configHelperNetworks[1].nodeUri
)
// const wallet = new Wallet.fromMnemonic(process.env.MNEMONIC);
// export const signer = wallet.connect(provider)

export const getTestConfig = async (signer: Signer) => {
  const { chainId } = await signer.provider.getNetwork()
  const config = new ConfigHelper().getConfig(String(chainId))
  config.providerUri = process.env.PROVIDER_URL || config.providerUri
  return config
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
