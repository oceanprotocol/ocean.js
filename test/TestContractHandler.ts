import Web3 from 'web3'
import { Contract } from 'web3-eth-contract'
import { AbiItem } from 'web3-utils/types'

const communityCollector = '0xeE9300b7961e0a01d9f0adb863C7A227A07AaD75'
const oceanAddress = '0x967da4048cd07ab37855c090aaf366e4ce1b9f48'
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

  public ERC721FactoryBytecode: string
  public ERC20TemplateBytecode: string
  public ERC721TemplateBytecode: string
  public RouterBytecode: string
  public SideStakingBytecode: string
  public FixedRateBytecode: string
  public DispenserBytecode: string
  public PoolTemplateBytecode: string
  public OPFCollectorBytecode: string
  

  public factory721Address: string
  public template721Address: string
  public template20Address: string
  public routerAddress:string
  public sideStakingAddress: string
  public fixedRateAddress:string
  public dispenserAddress: string
  public poolTemplateAddress: string
  public opfCollectorAddress: string
  

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
    
    template721Bytecode?: string,
    template20Bytecode?: string,
    poolTemplateBytecode?: string,
    factory721Bytecode?: string,
    routerBytecode?: string,
    sideStakingBytecode?: string,
    fixedRateBytecode?:string,
    dispenserBytecode?: string,
  ) {
    this.web3 = web3
    this.ERC721Template = new this.web3.eth.Contract(ERC721TemplateABI)
    this.ERC20Template = new this.web3.eth.Contract(ERC20TemplateABI)
    this.PoolTemplate = new this.web3.eth.Contract(PoolTemplateABI)
    this.ERC721Factory = new this.web3.eth.Contract(ERC721FactoryABI)
    this.Router=new this.web3.eth.Contract(RouterABI) 
    this.SideStaking = new this.web3.eth.Contract(SideStakingABI)
    this.FixedRate= new this.web3.eth.Contract(FixedRateABI) 
    this.Dispenser = new this.web3.eth.Contract(DispenserABI)
    

    this.ERC721FactoryBytecode = factory721Bytecode
    this.ERC20TemplateBytecode = template20Bytecode
    this.PoolTemplateBytecode = poolTemplateBytecode
    this.ERC721TemplateBytecode = template721Bytecode
    this.RouterBytecode = routerBytecode
    this.SideStakingBytecode = sideStakingBytecode
    this.FixedRateBytecode = fixedRateBytecode
    this.DispenserBytecode = dispenserBytecode
  }

  public async getAccounts(): Promise<string[]> {
    this.accounts = await this.web3.eth.getAccounts()
    return this.accounts
  }

  public async deployContracts(owner: string) {
    let estGas
   // console.log(this.ERC721TemplateBytecode)
   // console.log(this.ERC20TemplateBytecode)

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

    // DEPLOY ROUTER
    estGas = await this.Router.deploy({
      data: this.RouterBytecode,
      arguments: [owner,oceanAddress,this.poolTemplateAddress,communityCollector,[]]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.routerAddress = await this.Router.deploy({
      data: this.RouterBytecode,
      arguments: [owner,oceanAddress,this.poolTemplateAddress,communityCollector,[]]
    })
      .send({
        from: owner,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })


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
      
          // DEPLOY FIXED RATE
    estGas = await this.FixedRate.deploy({
      data: this.FixedRateBytecode,
      arguments: [this.routerAddress, communityCollector]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.fixedRateAddress = await this.FixedRate.deploy({
      data: this.FixedRateBytecode,
      arguments: [this.routerAddress, communityCollector]
    })
      .send({
        from: owner,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

              // DEPLOY Dispenser
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

               // DEPLOY ERC721 FACTORY
    estGas = await this.ERC721Factory.deploy({
      data: this.ERC721FactoryBytecode,
      arguments: [this.template721Address, this.template20Address, communityCollector,this.routerAddress]
    }).estimateGas(function (err, estGas) {
      if (err) console.log('DeployContracts: ' + err)
      return estGas
    })
    // deploy the contract and get it's address
    this.factory721Address = await this.ERC721Factory.deploy({
      data: this.ERC721FactoryBytecode,
      arguments: [this.template721Address, this.template20Address, communityCollector,this.routerAddress]
    })
      .send({
        from: owner,
        gas: estGas + 1,
        gasPrice: '3000000000'
      })
      .then(function (contract) {
        return contract.options.address
      })

    //  // TODO: SET ERC721 Factory address in ERC20 Factory
   
  }
}