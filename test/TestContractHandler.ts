import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
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
import { getAddresses, GAS_PRICE } from './config'

const deployContract = async (
  contract: Contract,
  bytecode: string,
  argumentsArray: any[],
  owner: string
) => {
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
  // deploy the contract and get it's address
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

export class TestContractHandler {
  public ERC721Factory: Contract
  public ERC20Template: Contract
  public ERC721Template: Contract
  public Router: Contract
  public SideStaking: Contract
  public FixedRate: Contract
  public Dispenser: Contract
  public OPFCollector: Contract
  public PoolTemplate: Contract
  public MockERC20: Contract
  public MockOcean: Contract

  public factory721Address: string
  public template721Address: string
  public template20Address: string
  public routerAddress: string
  public sideStakingAddress: string
  public fixedRateAddress: string
  public dispenserAddress: string
  public poolTemplateAddress: string
  public opfCollectorAddress: string
  public oceanAddress: string
  public daiAddress: string
  public usdcAddress: string
  public web3: Web3

  constructor(web3: Web3) {
    this.web3 = web3

    this.ERC721Template = new this.web3.eth.Contract(ERC721Template.abi as AbiItem[])
    this.ERC20Template = new this.web3.eth.Contract(ERC20Template.abi as AbiItem[])
    this.PoolTemplate = new this.web3.eth.Contract(PoolTemplate.abi as AbiItem[])
    this.ERC721Factory = new this.web3.eth.Contract(ERC721Factory.abi as AbiItem[])
    this.Router = new this.web3.eth.Contract(Router.abi as AbiItem[])
    this.SideStaking = new this.web3.eth.Contract(SideStaking.abi as AbiItem[])
    this.FixedRate = new this.web3.eth.Contract(FixedRate.abi as AbiItem[])
    this.Dispenser = new this.web3.eth.Contract(Dispenser.abi as AbiItem[])
    this.MockERC20 = new this.web3.eth.Contract(MockERC20.abi as AbiItem[])
    this.OPFCollector = new this.web3.eth.Contract(
      OPFCommunityFeeCollector.abi as AbiItem[]
    )
  }

  public async deployContracts(owner: string) {
    const addresses = getAddresses()

    // DEPLOY OPF Fee Collector
    this.opfCollectorAddress =
      addresses.OPFCommunityFeeCollector ||
      (await deployContract(
        this.OPFCollector,
        OPFCommunityFeeCollector.bytecode,
        [owner, owner],
        owner
      ))

    // DEPLOY POOL TEMPLATE
    this.poolTemplateAddress =
      addresses.poolTemplate ||
      (await deployContract(this.PoolTemplate, PoolTemplate.bytecode, [], owner))

    // DEPLOY ERC20 TEMPLATE
    this.template20Address =
      addresses.ERC20Template['1'] ||
      (await deployContract(this.ERC20Template, ERC20Template.bytecode, [], owner))

    // DEPLOY ERC721 TEMPLATE
    this.template721Address =
      addresses.ERC721Template['1'] ||
      (await deployContract(this.ERC721Template, ERC721Template.bytecode, [], owner))

    // DEPLOY OCEAN MOCK
    this.oceanAddress =
      addresses.Ocean ||
      (await deployContract(
        this.MockERC20,
        MockERC20.bytecode,
        ['OCEAN', 'OCEAN', 18],
        owner
      ))

    // DEPLOY ROUTER
    this.routerAddress =
      addresses.Router ||
      (await deployContract(
        this.Router,
        Router.bytecode,
        [
          owner,
          this.oceanAddress,
          this.poolTemplateAddress,
          this.opfCollectorAddress,
          []
        ],
        owner
      ))

    // DEPLOY SIDE STAKING
    this.sideStakingAddress =
      addresses.Staking ||
      (await deployContract(
        this.SideStaking,
        SideStaking.bytecode,
        [this.routerAddress],
        owner
      ))

    // DEPLOY FIXED RATE
    this.fixedRateAddress =
      addresses.FixedPrice ||
      (await deployContract(
        this.FixedRate,
        FixedRate.bytecode,
        [this.routerAddress, this.opfCollectorAddress],
        owner
      ))

    // DEPLOY Dispenser
    this.dispenserAddress =
      addresses.Dispenser ||
      (await deployContract(
        this.Dispenser,
        Dispenser.bytecode,
        [this.routerAddress],
        owner
      ))

    // DEPLOY ERC721 FACTORY
    this.factory721Address =
      addresses.ERC721Factory ||
      (await deployContract(
        this.ERC721Factory,
        ERC721Factory.bytecode,
        [
          this.template721Address,
          this.template20Address,
          this.opfCollectorAddress,
          this.routerAddress
        ],
        owner
      ))

    // DEPLOY USDC MOCK
    this.usdcAddress =
      addresses.MockUSDC ||
      (await deployContract(
        this.MockERC20,
        MockERC20.bytecode,
        ['USDC', 'USDC', 6],
        owner
      ))

    // DEPLOY DAI MOCK
    this.daiAddress =
      addresses.MockDAI ||
      (await deployContract(
        this.MockERC20,
        MockERC20.bytecode,
        ['DAI', 'DAI', 18],
        owner
      ))

    if (!addresses.Router) {
      const RouterContract = new this.web3.eth.Contract(
        Router.abi as AbiItem[],
        this.routerAddress
      )

      await RouterContract.methods
        .addFactory(this.factory721Address)
        .send({ from: owner })
      await RouterContract.methods
        .addFixedRateContract(this.fixedRateAddress)
        .send({ from: owner })
      await RouterContract.methods
        .addDispenserContract(this.dispenserAddress)
        .send({ from: owner })
      await RouterContract.methods
        .addSSContract(this.sideStakingAddress)
        .send({ from: owner })
      // TODO: add OPF deployment
      // await RouterContract.methods
      //   .changeRouterOwner(this.opfCollectorAddress)
      //   .send({ from: owner })
    }
  }
}
