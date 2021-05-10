import BigNumber from 'bignumber.js'
import Web3 from 'web3'

export async function getFairGasPrice(web3: Web3): Promise<string> {
  const x = new BigNumber(await web3.eth.getGasPrice())
  return x.multipliedBy(1.05).integerValue(BigNumber.ROUND_DOWN).toString(10)
}
