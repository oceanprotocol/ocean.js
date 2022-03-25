import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { getAddresses } from './config'

export class TestContractHandler {
  public accounts: string[]
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

  public ERC721FactoryBytecode: string
  public ERC20TemplateBytecode: string
  public ERC721TemplateBytecode: string
  public RouterBytecode: string
  public SideStakingBytecode: string
  public FixedRateBytecode: string
  public DispenserBytecode: string
  public PoolTemplateBytecode: string
  public OPFCollectorBytecode: string
  public MockERC20Bytecode: string
  public OPFBytecode: string

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

  constructor(
    web3: Web3,
    ERC721TemplateABI: AbiItem | AbiItem[],
    ERC20TemplateABI: AbiItem | AbiItem[],
    PoolTemplateABI?: AbiItem | AbiItem[],
    ERC721FactoryABI?: AbiItem | AbiItem[],
    RouterABI?: AbiItem | AbiItem[],
    SideStakingABI?: AbiItem | AbiItem[],
    FixedRateABI?: AbiItem | AbiItem[],
    DispenserABI?: AbiItem | AbiItem[],
    OPFABI?: AbiItem | AbiItem[],

    template721Bytecode?: string,
    template20Bytecode?: string,
    poolTemplateBytecode?: string,
    factory721Bytecode?: string,
    routerBytecode?: string,
    sideStakingBytecode?: string,
    fixedRateBytecode?: string,
    dispenserBytecode?: string,
    opfBytecode?: string
  ) {
    this.web3 = web3
    this.ERC721Template = new this.web3.eth.Contract(ERC721TemplateABI)
    this.ERC20Template = new this.web3.eth.Contract(ERC20TemplateABI)
    this.PoolTemplate = new this.web3.eth.Contract(PoolTemplateABI)
    this.ERC721Factory = new this.web3.eth.Contract(ERC721FactoryABI)
    this.Router = new this.web3.eth.Contract(RouterABI)
    this.SideStaking = new this.web3.eth.Contract(SideStakingABI)
    this.FixedRate = new this.web3.eth.Contract(FixedRateABI)
    this.Dispenser = new this.web3.eth.Contract(DispenserABI)
    this.MockERC20 = new this.web3.eth.Contract(MockERC20.abi as AbiItem[])
    this.OPFCollector = new this.web3.eth.Contract(OPFABI)

    this.ERC721FactoryBytecode = factory721Bytecode
    this.ERC20TemplateBytecode = template20Bytecode
    this.PoolTemplateBytecode = poolTemplateBytecode
    this.ERC721TemplateBytecode = template721Bytecode
    this.RouterBytecode = routerBytecode
    this.SideStakingBytecode = sideStakingBytecode
    this.FixedRateBytecode = fixedRateBytecode
    this.DispenserBytecode = dispenserBytecode
    this.MockERC20Bytecode = MockERC20.bytecode
    this.OPFBytecode = opfBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts(owner: string, routerABI?: AbiItem | AbiItem[]) {
    const addresses = getAddresses()

    let estGas
    if (addresses.OPFCommunityFeeCollector) {
      this.opfCollectorAddress = addresses.OPFCommunityFeeCollector
    } else {
      // DEPLOY OPF Fee Collector
      // get est gascost
      estGas = await this.OPFCollector.deploy({
        data: this.OPFBytecode,
        arguments: [owner, owner]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.opfCollectorAddress = await this.OPFCollector.deploy({
        data: this.OPFBytecode,
        arguments: [owner, owner]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    if (addresses.poolTemplate) {
      this.poolTemplateAddress = addresses.poolTemplate
    } else {
      // DEPLOY POOL TEMPLATE
      // get est gascost
      estGas = await this.PoolTemplate.deploy({
        data: this.PoolTemplateBytecode,
        arguments: []
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.poolTemplateAddress = await this.PoolTemplate.deploy({
        data: this.PoolTemplateBytecode,
        arguments: []
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }
    if (addresses.ERC20Template['1']) {
      this.template20Address = addresses.ERC20Template['1']
    } else {
      // DEPLOY ERC20 TEMPLATE
      // get est gascost
      estGas = await this.ERC20Template.deploy({
        data: this.ERC20TemplateBytecode,
        arguments: []
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.template20Address = await this.ERC20Template.deploy({
        data: this.ERC20TemplateBytecode,
        arguments: []
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }
    if (addresses.ERC721Template['1']) {
      this.template721Address = addresses.ERC721Template['1']
    } else {
      // DEPLOY ERC721 TEMPLATE
      // get est gascost
      estGas = await this.ERC721Template.deploy({
        data: this.ERC721TemplateBytecode,
        arguments: []
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.template721Address = await this.ERC721Template.deploy({
        data: this.ERC721TemplateBytecode,
        arguments: []
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    if (addresses.Ocean) {
      this.oceanAddress = addresses.Ocean
    } else {
      // DEPLOY OCEAN MOCK
      // get est gascost
      estGas = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['OCEAN', 'OCEAN', 18]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.oceanAddress = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['OCEAN', 'OCEAN', 18]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    if (addresses.Router) {
      this.routerAddress = addresses.Router
    } else {
      // DEPLOY ROUTER
      estGas = await this.Router.deploy({
        data: this.RouterBytecode,
        arguments: [
          owner,
          this.oceanAddress,
          this.poolTemplateAddress,
          this.opfCollectorAddress,
          []
        ]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.routerAddress = await this.Router.deploy({
        data: this.RouterBytecode,
        arguments: [
          owner,
          this.oceanAddress,
          this.poolTemplateAddress,
          this.opfCollectorAddress,
          []
        ]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    if (addresses.Staking) {
      this.sideStakingAddress = addresses.Staking
    } else {
      // DEPLOY SIDE STAKING
      estGas = await this.SideStaking.deploy({
        data: this.SideStakingBytecode,
        arguments: [this.routerAddress]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.sideStakingAddress = await this.SideStaking.deploy({
        data: this.SideStakingBytecode,
        arguments: [this.routerAddress]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    // DEPLOY FIXED RATE

    if (addresses.FixedPrice) {
      this.fixedRateAddress = addresses.FixedPrice
    } else {
      estGas = await this.FixedRate.deploy({
        data: this.FixedRateBytecode,
        arguments: [this.routerAddress, this.opfCollectorAddress]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.fixedRateAddress = await this.FixedRate.deploy({
        data: this.FixedRateBytecode,
        arguments: [this.routerAddress, this.opfCollectorAddress]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    // DEPLOY Dispenser

    if (addresses.Dispenser) {
      this.dispenserAddress = addresses.Dispenser
    } else {
      estGas = await this.Dispenser.deploy({
        data: this.DispenserBytecode,
        arguments: [this.routerAddress]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.dispenserAddress = await this.Dispenser.deploy({
        data: this.DispenserBytecode,
        arguments: [this.routerAddress]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    // DEPLOY ERC721 FACTORY

    if (addresses.ERC721Factory) {
      this.factory721Address = addresses.ERC721Factory
    } else {
      estGas = await this.ERC721Factory.deploy({
        data: this.ERC721FactoryBytecode,
        arguments: [
          this.template721Address,
          this.template20Address,
          this.opfCollectorAddress,
          this.routerAddress
        ]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })

      // deploy the contract and get it's address
      this.factory721Address = await this.ERC721Factory.deploy({
        data: this.ERC721FactoryBytecode,
        arguments: [
          this.template721Address,
          this.template20Address,
          this.opfCollectorAddress,
          this.routerAddress
        ]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    // DEPLOY USDC MOCK

    if (addresses.MockUSDC) {
      this.usdcAddress = addresses.MockUSDC
    } else {
      // get est gascost
      estGas = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['USDC', 'USDC', 6]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.usdcAddress = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['USDC', 'USDC', 6]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    // DEPLOY DAI MOCK

    if (addresses.MockDAI) {
      this.daiAddress = addresses.MockDAI
    } else {
      // get est gascost
      estGas = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['DAI', 'DAI', 18]
      }).estimateGas(function (err, estGas) {
        if (err) console.log('DeployContracts: ' + err)
        return estGas
      })
      // deploy the contract and get it's address
      this.daiAddress = await this.MockERC20.deploy({
        data: this.MockERC20Bytecode,
        arguments: ['DAI', 'DAI', 18]
      })
        .send({
          from: owner,
          gas: estGas + 1,
          gasPrice: '3000000000'
        })
        .then(function (contract) {
          return contract.options.address
        })
    }

    if (!addresses.Router) {
      const RouterContract = new this.web3.eth.Contract(routerABI, this.routerAddress)

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
