import Web3 from 'web3'
import { AbiItem } from 'web3-utils/types'
import OPFCommunityFeeCollector from '@oceanprotocol/contracts/artifacts/contracts/communityFee/OPFCommunityFeeCollector.sol/OPFCommunityFeeCollector.json'
import ERC20Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC20Template.sol/ERC20Template.json'
import ERC721Template from '@oceanprotocol/contracts/artifacts/contracts/templates/ERC721Template.sol/ERC721Template.json'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import Router from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import FixedRate from '@oceanprotocol/contracts/artifacts/contracts/pools/fixedRate/FixedRateExchange.sol/FixedRateExchange.json'
import Dispenser from '@oceanprotocol/contracts/artifacts/contracts/pools/dispenser/Dispenser.sol/Dispenser.json'
import ERC721Factory from '@oceanprotocol/contracts/artifacts/contracts/ERC721Factory.sol/ERC721Factory.json'
import { getAddresses, GAS_PRICE } from './config'

const estimateGasAndDeployContract = async (
  web3: Web3,
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
}

export const deployContracts = async (web3: Web3, owner: string): Promise<Addresses> => {
  const addresses: Addresses = {} as Addresses
  const configAddresses = getAddresses()

  // deploy OPF free collector
  addresses.opfCommunityFeeCollectorAddress =
    configAddresses.OPFCommunityFeeCollector ||
    (await estimateGasAndDeployContract(
      web3,
      OPFCommunityFeeCollector.abi as AbiItem[],
      OPFCommunityFeeCollector.bytecode,
      [owner, owner],
      owner
    ))

  // deploy Datatoken template
  addresses.datatokenTemplateAddress =
    configAddresses.ERC20Template['1'] ||
    (await estimateGasAndDeployContract(
      web3,
      ERC20Template.abi as AbiItem[],
      ERC20Template.bytecode,
      [],
      owner
    ))

  // deploy NFT template
  addresses.nftTemplateAddress =
    configAddresses.ERC721Template['1'] ||
    (await estimateGasAndDeployContract(
      web3,
      ERC721Template.abi as AbiItem[],
      ERC721Template.bytecode,
      [],
      owner
    ))

  // deploy OCEAN mock tocken
  addresses.oceanAddress =
    configAddresses.Ocean ||
    (await estimateGasAndDeployContract(
      web3,
      MockERC20.abi as AbiItem[],
      MockERC20.bytecode,
      ['OCEAN', 'OCEAN', 18],
      owner
    ))

  // deploy router
  addresses.routerAddress =
    configAddresses.Router ||
    (await estimateGasAndDeployContract(
      web3,
      Router.abi as AbiItem[],
      Router.bytecode,
      [owner, addresses.oceanAddress, addresses.opfCommunityFeeCollectorAddress, []],
      owner
    ))

  // deploy fixed rate
  addresses.fixedRateAddress =
    configAddresses.FixedPrice ||
    (await estimateGasAndDeployContract(
      web3,
      FixedRate.abi as AbiItem[],
      FixedRate.bytecode,
      [addresses.routerAddress, addresses.opfCommunityFeeCollectorAddress],
      owner
    ))

  // deploy dispenser
  addresses.dispenserAddress =
    configAddresses.Dispenser ||
    (await estimateGasAndDeployContract(
      web3,
      Dispenser.abi as AbiItem[],
      Dispenser.bytecode,
      [addresses.routerAddress],
      owner
    ))

  // deploy NFT factory
  addresses.nftFactoryAddress =
    configAddresses.ERC721Factory ||
    (await estimateGasAndDeployContract(
      web3,
      ERC721Factory.abi as AbiItem[],
      ERC721Factory.bytecode,
      [
        addresses.nftTemplateAddress,
        addresses.datatokenTemplateAddress,
        addresses.opfCommunityFeeCollectorAddress,
        addresses.routerAddress
      ],
      owner
    ))

  // deploy USDC mock tocken
  addresses.usdcAddress =
    configAddresses.MockUSDC ||
    (await estimateGasAndDeployContract(
      web3,
      MockERC20.abi as AbiItem[],
      MockERC20.bytecode,
      ['USDC', 'USDC', 6],
      owner
    ))

  // deploy DAI mock tocken
  addresses.daiAddress =
    configAddresses.MockDAI ||
    (await estimateGasAndDeployContract(
      web3,
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
      .addFactory(addresses.nftFactoryAddress)
      .send({ from: owner })
    await RouterContract.methods
      .addFixedRateContract(addresses.fixedRateAddress)
      .send({ from: owner })
  }

  return addresses
}
