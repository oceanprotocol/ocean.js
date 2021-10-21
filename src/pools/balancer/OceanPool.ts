import Web3 from 'web3'
import { AbiItem } from 'web3-utils'
import { Contract } from 'web3-eth-contract'
import defaultPoolABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IPool.sol/IPool.json'
import defaultERC20ABI from '@oceanprotocol/contracts/artifacts/contracts/interfaces/IERC20.sol/IERC20.json'
import { PoolFactory } from './PoolFactory'
import { Logger } from '../../utils'

export class OceanPool extends PoolFactory {
  public oceanAddress: string = null
  public dtAddress: string = null
  public startBlock: number
  public vaultABI: AbiItem | AbiItem[]
  public vaultAddress: string
  public vault: Contract
  public poolABI: AbiItem | AbiItem[]
  public erc20ABI: AbiItem | AbiItem[]

  constructor(
    web3: Web3,
    logger: Logger,
    routerAddress: string = null,
    oceanAddress: string = null,
    startBlock?: number
  ) {
    super(web3, logger, routerAddress)

    this.poolABI = defaultPoolABI.abi as AbiItem[]
    this.erc20ABI = defaultERC20ABI.abi as AbiItem[]
    this.vault = new this.web3.eth.Contract(this.vaultABI, this.vaultAddress)

    // if (oceanAddress) {
    //   this.oceanAddress = oceanAddress
    // }
    if (startBlock) this.startBlock = startBlock
    else this.startBlock = 0
  }
}
