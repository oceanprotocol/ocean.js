import BigNumber from 'bignumber.js'
import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { ConfigHelperConfig } from './ConfigHelper'

export async function getFairGasPrice(
  web3: Web3,
  config: ConfigHelperConfig
): Promise<string> {
  const x = new BigNumber(await web3.eth.getGasPrice())
  if (config && config.gasFeeMultiplier)
    return x
      .multipliedBy(config.gasFeeMultiplier)
      .integerValue(BigNumber.ROUND_DOWN)
      .toString(10)
  else return x.toString(10)
}

export function setContractDefaults(
  contract: Contract,
  config: ConfigHelperConfig
): Contract {
  if (config) {
    contract.transactionBlockTimeout = config.transactionBlockTimeout
    contract.transactionConfirmationBlocks = config.transactionConfirmationBlocks
    contract.transactionPollingTimeout = config.transactionPollingTimeout
  }
  return contract
}
