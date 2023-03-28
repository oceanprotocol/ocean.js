import { providers, Signer } from 'ethers'
import fs from 'fs'
import { homedir } from 'os'
import { ConfigHelper, configHelperNetworks } from '../src/config'
import { LoggerInstance, LogLevel } from '../src/utils'

LoggerInstance.setLevel(LogLevel.Error)

export interface Addresses {
  opfCommunityFeeCollectorAddress: string
  datatokenTemplateAddress: string
  nftTemplateAddress: string
  oceanAddress: string
  routerAddress: string
  sideStakingAddress: string
  fixedRateAddress: string
  dispenserAddress: string
  nftFactoryAddress: string
  daiAddress: string
  usdcAddress: string
  poolTemplateAddress: string
}

export const GAS_PRICE = '3000000000'

// by default, we connect with development network
export const provider = new providers.JsonRpcProvider(
  process.env.NODE_URI || configHelperNetworks[1].nodeUri
)
// const wallet = new Wallet.fromMnemonic(process.env.MNEMONIC);
// export const signer = wallet.connect(provider)

export const getTestConfig = async (signer: Signer) => {
  const { chainId } = await signer.provider.getNetwork()
  const config = new ConfigHelper().getConfig(parseInt(String(chainId)))
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
