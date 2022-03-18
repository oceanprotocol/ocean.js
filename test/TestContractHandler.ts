import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'
import MockERC20 from '@oceanprotocol/contracts/artifacts/contracts/utils/mock/MockERC20Decimals.sol/MockERC20Decimals.json'
import { getAddresses } from './config'

const GAS_PRICE = '3000000000'

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

    // DEPLOY OPF Fee Collector
    this.opfCollectorAddress =
      addresses.OPFCommunityFeeCollector ||
      (await deployContract(this.OPFCollector, this.OPFBytecode, [owner, owner], owner))

    // DEPLOY POOL TEMPLATE
    this.poolTemplateAddress =
      addresses.poolTemplate ||
      (await deployContract(this.PoolTemplate, this.PoolTemplateBytecode, [], owner))

    // DEPLOY ERC20 TEMPLATE
    this.template20Address =
      addresses.ERC20Template['1'] ||
      (await deployContract(this.ERC20Template, this.ERC20TemplateBytecode, [], owner))

    // DEPLOY ERC721 TEMPLATE
    this.template721Address =
      addresses.ERC721Template['1'] ||
      (await deployContract(this.ERC721Template, this.ERC721TemplateBytecode, [], owner))

    // DEPLOY OCEAN MOCK
    this.oceanAddress =
      addresses.Ocean ||
      (await deployContract(
        this.MockERC20,
        this.MockERC20Bytecode,
        ['OCEAN', 'OCEAN', 18],
        owner
      ))

    // DEPLOY ROUTER
    this.routerAddress =
      addresses.Router ||
      (await deployContract(
        this.Router,
        this.RouterBytecode,
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
        this.SideStakingBytecode,
        [this.routerAddress],
        owner
      ))

    // DEPLOY FIXED RATE
    this.fixedRateAddress =
      addresses.FixedPrice ||
      (await deployContract(
        this.FixedRate,
        this.FixedRateBytecode,
        [this.routerAddress, this.opfCollectorAddress],
        owner
      ))

    // DEPLOY Dispenser
    this.dispenserAddress =
      addresses.Dispenser ||
      (await deployContract(
        this.Dispenser,
        this.DispenserBytecode,
        [this.routerAddress],
        owner
      ))

    // DEPLOY ERC721 FACTORY
    this.factory721Address =
      addresses.ERC721Factory ||
      (await deployContract(
        this.ERC721Factory,
        this.ERC721FactoryBytecode,
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
        this.MockERC20Bytecode,
        ['USDC', 'USDC', 6],
        owner
      ))

    // DEPLOY DAI MOCK
    this.daiAddress =
      addresses.MockDAI ||
      (await deployContract(
        this.MockERC20,
        this.MockERC20Bytecode,
        ['DAI', 'DAI', 18],
        owner
      ))

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
