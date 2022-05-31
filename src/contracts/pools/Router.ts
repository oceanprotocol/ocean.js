import { TransactionReceipt } from 'web3-core'
import { AbiItem } from 'web3-utils'
import FactoryRouter from '@oceanprotocol/contracts/artifacts/contracts/pools/FactoryRouter.sol/FactoryRouter.json'
import { getFairGasPrice, estimateGas } from '../../utils'
import { Operation } from '../../@types'
import { SmartContractWithAddress } from '..'

/**
 * Provides an interface for FactoryRouter contract
 */
export class Router extends SmartContractWithAddress {
  getDefaultAbi(): AbiItem | AbiItem[] {
    return FactoryRouter.abi as AbiItem[]
  }

  /**
   * Estimate gas cost for buyDTBatch method
   * @param {String} address
   * @param {Operation} operations Operations objects array
   * @return {Promise<TransactionReceipt>} Transaction receipt
   */
  public async estGasBuyDTBatch(address: string, operations: Operation[]): Promise<any> {
    return estimateGas(address, this.contract.methods.buyDTBatch, operations)
  }

  /**
   * BuyDTBatch
   * @param {String} address
   * @param {Operation} operations Operations objects array
   * @return {Promise<TransactionReceipt>} Transaction receipt
   */
  public async buyDTBatch(
    address: string,
    operations: Operation[]
  ): Promise<TransactionReceipt> {
    const estGas = await estimateGas(
      address,
      this.contract.methods.buyDTBatch,
      operations
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.buyDTBatch(operations).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /** Check if a token is on approved tokens list, if true opfFee is lower in pools with that token/DT
   * @return {Promise<boolean>} true if is on the list.
   */
  public async isApprovedToken(address: string): Promise<boolean> {
    return await this.contract.methods.isApprovedToken(address).call()
  }

  /** Check if an address is a side staking contract.
   * @return {Promise<boolean>} true if is a SS contract
   */
  public async isSideStaking(address: string): Promise<boolean> {
    return await this.contract.methods.isSSContract(address).call()
  }

  /** Check if an address is a Fixed Rate contract.
   * @return {Promise<boolean>} true if is a Fixed Rate contract
   */
  public async isFixedPrice(address: string): Promise<boolean> {
    return await this.contract.methods.isFixedRateContract(address).call()
  }

  /** Get Router Owner
   * @return {Promise<string>} Router Owner address
   */
  public async getOwner(): Promise<string> {
    return await this.contract.methods.routerOwner().call()
  }

  /** Get NFT Factory address
   * @return {Promise<string>} NFT Factory address
   */
  public async getNFTFactory(): Promise<string> {
    return await this.contract.methods.factory().call()
  }

  /** Check if an address is a pool template contract.
   * @return {Promise<boolean>} true if is a Template
   */
  public async isPoolTemplate(address: string): Promise<boolean> {
    return await this.contract.methods.isPoolTemplate(address).call()
  }

  /**
   * Estimate gas cost for addApprovedToken
   * @param {String} address
   * @param {String} tokenAddress token address we want to add
   * @return {Promise<any>}
   */
  public async estGasAddApprovedToken(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.addApprovedToken, tokenAddress)
  }

  /**
   * Add a new token to oceanTokens list, pools with baseToken in this list have NO opf Fee
   * @param {String} address caller address
   * @param {String} tokenAddress token address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addApprovedToken(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addApprovedToken,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.addApprovedToken(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeApprovedToken
   * @param {String} address caller address
   * @param {String} tokenAddress token address we want to add
   * @return {Promise<any>}
   */
  public async estGasRemoveApprovedToken(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.removeApprovedToken, tokenAddress)
  }

  /**
   * Remove a token from oceanTokens list, pools without baseToken in this list have a opf Fee
   * @param {String} address
   * @param {String} tokenAddress address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async removeApprovedToken(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.removeApprovedToken,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .removeApprovedToken(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addSSContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddSSContract(address: string, tokenAddress: string): Promise<any> {
    return estimateGas(address, this.contract.methods.addSSContract, tokenAddress)
  }

  /**
   * Add a new contract to ssContract list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addSSContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addSSContract,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.addSSContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removeSSContract method
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveSSContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.removeSSContract, tokenAddress)
  }

  /**
   * Removes a new contract from ssContract list
   * @param {String} address caller address
   * @param {String} tokenAddress contract address to removed
   * @return {Promise<TransactionReceipt>}
   */
  public async removeSSContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.removeSSContract,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.removeSSContract(tokenAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addFixedRateContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.addFixedRateContract, tokenAddress)
  }

  /**
   * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addFixedRateContract,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .addFixedRateContract(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addFixedRateContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.removeFixedRateContract,
      tokenAddress
    )
  }

  /**
   * Removes a contract from fixedRate list
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async removeFixedRateContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.removeFixedRateContract,
      tokenAddress
    )

    // Invoke removeFixedRateContract function of the contract
    const trxReceipt = await this.contract.methods
      .removeFixedRateContract(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addDispenserContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.addDispenserContract, tokenAddress)
  }

  /**
   * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addDispenserContract,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .addDispenserContract(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addDispenserContract method
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemoveDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.removeDispenserContract,
      tokenAddress
    )
  }

  /**
   * Add a new contract to dispenser list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {String} tokenAddress contract address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async removeDispenserContract(
    address: string,
    tokenAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.removeDispenserContract,
      tokenAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .removeDispenserContract(tokenAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /** Get OPF Fee per token
   * @return {Promise<number>} OPC fee for a specific baseToken
   */
  public async getOPCFee(baseToken: string): Promise<number> {
    return await this.contract.methods.getOPCFee(baseToken).call()
  }

  /** Get Current OPF Fee
   * @return {Promise<number>} OPF fee
   */
  public async getCurrentOPCFee(): Promise<number> {
    return await this.contract.methods.swapOceanFee().call()
  }

  /**
   * Estimate gas cost for updateOPFFee method
   * @param {String} address
   * @param {String} newFee new OPF Fee
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasUpdateOPCFee(
    address: string,
    newSwapOceanFee: number,
    newSwapNonOceanFee: number,
    newConsumeFee: number,
    newProviderFee: number
  ): Promise<any> {
    return estimateGas(
      address,
      this.contract.methods.updateOPCFee,
      newSwapOceanFee,
      newSwapNonOceanFee,
      newConsumeFee,
      newProviderFee
    )
  }

  /**
   * Add a new contract to fixedRate list, after is added, can be used when deploying a new pool
   * @param {String} address
   * @param {number} newSwapOceanFee Amount charged for swapping with ocean approved tokens
   * @param {number} newSwapNonOceanFee Amount charged for swapping with non ocean approved tokens
   * @param {number} newConsumeFee Amount charged from consumeFees
   * @param {number} newProviderFee Amount charged for providerFees
   * @return {Promise<TransactionReceipt>}
   */
  public async updateOPCFee(
    address: string,
    newSwapOceanFee: number,
    newSwapNonOceanFee: number,
    newConsumeFee: number,
    newProviderFee: number
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.updateOPCFee,
      newSwapOceanFee,
      newSwapNonOceanFee,
      newConsumeFee,
      newProviderFee
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .updateOPCFee(newSwapOceanFee, newSwapNonOceanFee, newConsumeFee, newProviderFee)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }

  /**
   * Estimate gas cost for addPoolTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasAddPoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.addPoolTemplate, templateAddress)
  }

  /**
   * Add a new template to poolTemplates mapping, after template is added,it can be used
   * @param {String} address
   * @param {String} templateAddress template address to add
   * @return {Promise<TransactionReceipt>}
   */
  public async addPoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.addPoolTemplate,
      templateAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods.addPoolTemplate(templateAddress).send({
      from: address,
      gas: estGas + 1,
      gasPrice: await getFairGasPrice(this.web3, this.config)
    })

    return trxReceipt
  }

  /**
   * Estimate gas cost for removePoolTemplate method
   * @param {String} address
   * @param {String} templateAddress template address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async estGasRemovePoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<any> {
    return estimateGas(address, this.contract.methods.removePoolTemplate, templateAddress)
  }

  /**
   * Remove template from poolTemplates mapping, after template is removed,it can be used anymore
   * @param {String} address
   * @param {String} templateAddress template address to remove
   * @return {Promise<TransactionReceipt>}
   */
  public async removePoolTemplate(
    address: string,
    templateAddress: string
  ): Promise<TransactionReceipt> {
    if ((await this.getOwner()) !== address) {
      throw new Error(`Caller is not Router Owner`)
    }

    const estGas = await estimateGas(
      address,
      this.contract.methods.removePoolTemplate,
      templateAddress
    )

    // Invoke createToken function of the contract
    const trxReceipt = await this.contract.methods
      .removePoolTemplate(templateAddress)
      .send({
        from: address,
        gas: estGas + 1,
        gasPrice: await getFairGasPrice(this.web3, this.config)
      })

    return trxReceipt
  }
}
