import { AbiItem } from 'web3-utils/types'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import PoolTemplate from '@oceanprotocol/contracts/artifacts/contracts/pools/balancer/BPool.sol/BPool.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import SideStaking from '@oceanprotocol/contracts/artifacts/contracts/pools/ssContracts/SideStaking.sol/SideStaking.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import OPFCommunityFeeCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import { web3, getAddresses, GAS_PRICE } from './config'

const estimateGasAndDeployContract = async (
  abi: AbiItem | AbiItem[],
  bytecode: string,
  argumentsArray: any[],
  owner: string
) => {
  const contract = new web3.eth.Contract(abi)
  // get est gascost
  const estimatedGas = await contract
    .deploy({
      data: bytecode,
      arguments: argumentsArray
    })
    .estimateGas(function (err, estimatedGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estimatedGas
    })
  // deploy the contract and get its address
  return await contract
    .deploy({
      data: bytecode,
      arguments: argumentsArray
    })
    .send({
      from: owner,
      gas: estimatedGas + 1,
      gasPrice: GAS_PRICE
    })
    .then(function (contract) {
      return contract.options.address
    })
}

export interface Addresses {
  factory721Address: string
  template721Address: string
  template20Address: string
  routerAddress: string
  sideStakingAddress: string
  fixedRateAddress: string
  dispenserAddress: string
  poolTemplateAddress: string
  opfCollectorAddress: string
  oceanAddress: string
  daiAddress: string
  usdcAddress: string
}

export const deployContracts = async (owner: string): Promise<Addresses> => {
  const addresses: Addresses = {} as Addresses
  const configAddresses = getAddresses()

  // deploy OPF free collector
  addresses.opfCollectorAddress =
    configAddresses.OPFCommunityFeeCollector ||
    (await estimateGasAndDeployContract(
      OPFCommunityFeeCollector.abi as AbiItem[],
      OPFCommunityFeeCollector.bytecode,
      [owner, owner],
      owner
    ))

  // deploy pool template
  addresses.poolTemplateAddress =
    configAddresses.poolTemplate ||
    (await estimateGasAndDeployContract(
      PoolTemplate.abi as AbiItem[],
      PoolTemplate.bytecode,
      [],
      owner
    ))

  // deploy ERC20 template
  addresses.template20Address =
    configAddresses.ERC20Template['1'] ||
    (await estimateGasAndDeployContract(
      ERC20Template.abi as AbiItem[],
      ERC20Template.bytecode,
      [],
      owner
    ))

  // deploy ERC721 template
  addresses.template721Address =
    configAddresses.ERC721Template['1'] ||
    (await estimateGasAndDeployContract(
      ERC721Template.abi as AbiItem[],
      ERC721Template.bytecode,
      [],
      owner
    ))

  // deploy OCEAN mock tocken
  addresses.oceanAddress =
    configAddresses.Ocean ||
    (await estimateGasAndDeployContract(
      MockERC20.abi as AbiItem[],
      MockERC20.bytecode,
      ['OCEAN', 'OCEAN', 18],
      owner
    ))

  // deploy router
  addresses.routerAddress =
    configAddresses.Router ||
    (await estimateGasAndDeployContract(
      Router.abi as AbiItem[],
      Router.bytecode,
      [
        owner,
        addresses.oceanAddress,
        addresses.poolTemplateAddress,
        addresses.opfCollectorAddress,
        []
      ],
      owner
    ))

  // deploy side stacking
  addresses.sideStakingAddress =
    configAddresses.Staking ||
    (await estimateGasAndDeployContract(
      SideStaking.abi as AbiItem[],
      SideStaking.bytecode,
      [addresses.routerAddress],
      owner
    ))

  // deploy fixed rate
  addresses.fixedRateAddress =
    configAddresses.FixedPrice ||
    (await estimateGasAndDeployContract(
      FixedRate.abi as AbiItem[],
      FixedRate.bytecode,
      [addresses.routerAddress, addresses.opfCollectorAddress],
      owner
    ))

  // deploy dispenser
  addresses.dispenserAddress =
    configAddresses.Dispenser ||
    (await estimateGasAndDeployContract(
      Dispenser.abi as AbiItem[],
      Dispenser.bytecode,
      [addresses.routerAddress],
      owner
    ))

  // deploy ERC721 factory
  addresses.factory721Address =
    configAddresses.ERC721Factory ||
    (await estimateGasAndDeployContract(
      ERC721Factory.abi as AbiItem[],
      ERC721Factory.bytecode,
      [
        addresses.template721Address,
        addresses.template20Address,
        addresses.opfCollectorAddress,
        addresses.routerAddress
      ],
      owner
    ))

  // deploy USDC mock tocken
  addresses.usdcAddress =
    configAddresses.MockUSDC ||
    (await estimateGasAndDeployContract(
      MockERC20.abi as AbiItem[],
      MockERC20.bytecode,
      ['USDC', 'USDC', 6],
      owner
    ))

  // deploy DAI mock tocken
  addresses.daiAddress =
    configAddresses.MockDAI ||
    (await estimateGasAndDeployContract(
      MockERC20.abi as AbiItem[],
      MockERC20.bytecode,
      ['DAI', 'DAI', 18],
      owner
    ))

  if (!configAddresses.Router) {
    const RouterContract = new web3.eth.Contract(
      Router.abi as AbiItem[],
      addresses.routerAddress
    )

    await RouterContract.methods
      .addFactory(addresses.factory721Address)
      .send({ from: owner })
    await RouterContract.methods
      .addFixedRateContract(addresses.fixedRateAddress)
      .send({ from: owner })
    await RouterContract.methods
      .addDispenserContract(addresses.dispenserAddress)
      .send({ from: owner })
    await RouterContract.methods
      .addSSContract(addresses.sideStakingAddress)
      .send({ from: owner })
    // TODO: add OPF deployment
    // await RouterContract.methods
    //   .changeRouterOwner(this.opfCollectorAddress)
    //   .send({ from: owner })
  }

  return addresses
}
