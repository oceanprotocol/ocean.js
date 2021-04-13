# Overview

Here is an overview of all ot the main functions and submodules:

### Ocean instance
Create/get datatoken, get dtfactory, user orders (history)

```
import { Ocean } from '@oceanprotocol/lib'
const ocean = await Ocean.getInstance(config)
```

Then use the following submodules...

# Assets
Publish, get, list, search, order, consume/download
```Typescript
ocean.asset.getInstance(config: InstantiableConfig): Promise<Assets>;
```
```Typescript
ocean.asset.create(metadata: Metadata, publisher: Account, services?: Service[], dtAddress?: string, cap?: string, name?: string, symbol?: string, providerUri?: string): SubscribablePromise<CreateProgressStep, DDO>;
```
```Typescript
ocean.asset.ownerAssets(owner: string): Promise<QueryResult>;
```
```Typescript
ocean.asset.resolve(did: string): Promise<DDO>;
```
```Typescript
ocean.asset.resolveByDTAddress(dtAddress: string, offset?: number, page?: number, sort?: number): Promise<DDO[]>;
```
```Typescript
ocean.asset.editMetadata(ddo: DDO, newMetadata: EditableMetadata): Promise<DDO>;
```
```Typescript
ocean.asset.updateMetadata(ddo: DDO, consumerAccount: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.asset.editServiceTimeout(ddo: DDO, serviceIndex: number, timeout: number): Promise<DDO>;
```
```Typescript
ocean.asset.creator(did: string): Promise<string>;
```
```Typescript
ocean.asset.query(query: SearchQuery): Promise<QueryResult>;
```
```Typescript
ocean.asset.search(text: string): Promise<QueryResult>;
```
```Typescript
ocean.asset.getServiceByType(did: string, serviceType: string): Promise<Service>;
```
```Typescript
ocean.asset.getServiceByIndex(did: string, serviceIndex: number): Promise<Service>;
```
```Typescript
ocean.asset.createAccessServiceAttributes(creator: Account, cost: string, datePublished: string, timeout?: number, providerUri?: string): Promise<ServiceAccess>;
```
```Typescript
ocean.asset.initialize(did: string, serviceType: string, consumerAddress: string, serviceIndex: number, serviceEndpoint: string): Promise<any>;
```
```Typescript
ocean.asset.order(did: string, serviceType: string, payerAddress: string, serviceIndex?: number, mpAddress?: string, consumerAddress?: string, searchPreviousOrders?: boolean): Promise<string>;
```
```Typescript
ocean.asset.download(did: string, txId: string, tokenAddress: string, consumerAccount: Account, destination: string): Promise<string | true>;
```
```Typescript
ocean.asset.simpleDownload(dtAddress: string, serviceEndpoint: string, txId: string, account: string): Promise<string>;
```
```Typescript
ocean.asset.getOrderHistory(account: Account, serviceType?: string, fromBlock?: number): Promise<Order[]>;
```

# Datatoken Pool
Create, add/remove liquidity, check liquidity, price, buy datatokens

```Typescript
ocean.pool.
```
```Typescript
ocean.pool.createDTPool(account: string, token: string, amount: string, weight: string, fee: string): Promise<string>;
```
```Typescript
ocean.pool.getDTAddress(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanReserve(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getDTReserve(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getMaxBuyQuantity(poolAddress: string, tokenAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanMaxBuyQuantity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getDTMaxBuyQuantity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.calcInGivenOut(poolAddress: string, tokenInAddress: string, tokenOutAddress: string, tokenOutAmount: string): Promise<string>;
```
```Typescript
ocean.pool.calcOutGivenIn(poolAddress: string, tokenInAddress: string, tokenOutAddress: string, tokenInAmount: string): Promise<string>;
```
```Typescript
ocean.pool.calcPoolOutGivenSingleIn(poolAddress: string, tokenInAddress: string, tokenInAmount: string): Promise<string>;
```
```Typescript
ocean.pool.calcSingleInGivenPoolOut(poolAddress: string, tokenInAddress: string, poolShares: string): Promise<string>;
```
```Typescript
ocean.pool.calcSingleOutGivenPoolIn(poolAddress: string, tokenOutAddress: string, poolShares: string): Promise<string>;
```
```Typescript
ocean.pool.calcPoolInGivenSingleOut(poolAddress: string, tokenOutAddress: string, tokenOutAmount: string): Promise<string>;
```
```Typescript
ocean.pool.getPoolSharesRequiredToRemoveDT(poolAddress: string, dtAmount: string): Promise<string>;
```
```Typescript
ocean.pool.getDTRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<string>;
```
```Typescript
ocean.pool.getPoolSharesRequiredToRemoveOcean(poolAddress: string, oceanAmount: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<string>;
```
```Typescript
ocean.pool.getTokensRemovedforPoolShares(poolAddress: string, poolShares: string): Promise<TokensReceived>;
```
```Typescript
ocean.pool.getDTMaxAddLiquidity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanMaxAddLiquidity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getMaxAddLiquidity(poolAddress: string, tokenAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getMaxRemoveLiquidity(poolAddress: string, tokenAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getDTMaxRemoveLiquidity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanMaxRemoveLiquidity(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.buyDT(account: string, poolAddress: string, dtAmountWanted: string, maxOceanAmount: string, maxPrice?: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.sellDT(account: string, poolAddress: string, dtAmount: string, oceanAmountWanted: string, maxPrice?: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.addDTLiquidity(account: string, poolAddress: string, amount: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.removeDTLiquidity(account: string, poolAddress: string, amount: string, maximumPoolShares: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.addOceanLiquidity(account: string, poolAddress: string, amount: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.removeOceanLiquidity(account: string, poolAddress: string, amount: string, maximumPoolShares: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.removePoolLiquidity(account: string, poolAddress: string, poolShares: string, minDT?: string, minOcean?: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.pool.getDTPrice(poolAddress: string): Promise<string>;
```
```Typescript
ocean.pool.searchPoolforDT(dtAddress: string): Promise<string[]>;
```
```Typescript
ocean.pool.getOceanNeeded(poolAddress: string, dtRequired: string): Promise<string>;
```
```Typescript
ocean.pool.getOceanReceived(poolAddress: string, dtSold: string): Promise<string>;
```
```Typescript
ocean.pool.getDTNeeded(poolAddress: string, OceanRequired: string): Promise<string>;
```
```Typescript
ocean.pool.getPoolsbyCreator(account?: string): Promise<PoolDetails[]>;
```
```Typescript
ocean.pool.getPoolDetails(poolAddress: string): Promise<PoolDetails>;
```
```Typescript
ocean.pool.getPoolLogs(poolAddress: string, account?: string): Promise<PoolTransaction[]>;
```
```Typescript
ocean.pool.getAllPoolLogs(account: string): Promise<PoolTransaction[]>;
```

# Fixed rate exchange
Create, price, buy datatokens  

```Typescript
ocean.exchange.create(dataToken: string, rate: string, address: string): Promise<string>;
```
```Typescript
ocean.exchange.generateExchangeId(dataToken: string, owner: string): Promise<string>;
```
```Typescript
ocean.exchange.buyDT(exchangeId: string, dataTokenAmount: string, address: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.exchange.getNumberOfExchanges(): Promise<number>;
```
```Typescript
ocean.exchange.setRate(exchangeId: string, newRate: number, address: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.exchange.activate(exchangeId: string, address: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.exchange.deactivate(exchangeId: string, address: string): Promise<TransactionReceipt>;
```
```Typescript
ocean.exchange.getRate(exchangeId: string): Promise<string>;
```
```Typescript
ocean.exchange.getSupply(exchangeId: string): Promise<string>;
```
```Typescript
ocean.exchange.getOceanNeeded(exchangeId: string, dataTokenAmount: string): Promise<string>;
```
```Typescript
ocean.exchange.getExchange(exchangeId: string): Promise<FixedPriceExchange>;
```
```Typescript
ocean.exchange.getExchanges(): Promise<string[]>;
```
```Typescript
ocean.exchange.isActive(exchangeId: string): Promise<boolean>;
```
```Typescript
ocean.exchange.CalcInGivenOut(exchangeId: string, dataTokenAmount: string): Promise<string>;
```
```Typescript
ocean.exchange.searchforDT(dataTokenAddress: string, minSupply: string): Promise<FixedPriceExchange[]>;
```
```Typescript
ocean.exchange.getExchangesbyCreator(account?: string): Promise<FixedPriceExchange[]>;
```
```Typescript
ocean.exchange.getExchangeSwaps(exchangeId: string, account?: string): Promise<FixedPriceSwap[]>;
```
```Typescript
ocean.exchange.getAllExchangesSwaps(account: string): Promise<FixedPriceSwap[]>;
```

# Compute-to-data
consume/start, stop, results, status, define-service

```Typescript
ocean.compute.start(did: string, txId: string, tokenAddress: string, consumerAccount: Account, algorithmDid?: string, algorithmMeta?: MetadataAlgorithm, output?: Output, serviceIndex?: string, serviceType?: string, algorithmTransferTxId?: string, algorithmDataToken?: string): Promise<ComputeJob>;
```
```Typescript
ocean.compute.stop(consumerAccount: Account, did: string, jobId: string): Promise<ComputeJob>;
```
```Typescript
ocean.compute.delete(consumerAccount: Account, did: string, jobId: string): Promise<ComputeJob>;
```
```Typescript
ocean.compute.status(consumerAccount: Account, did?: string, jobId?: string): Promise<ComputeJob[]>;
```
```Typescript
ocean.compute.result(consumerAccount: Account, did: string, jobId: string): Promise<ComputeJob>;
```
```Typescript
ocean.compute.createServerAttributes(serverId: string, serverType: string, cost: string, cpu: string, gpu: string, memory: string, disk: string, maxExecutionTime: number): Server;
```
```Typescript
ocean.compute.createContainerAttributes(image: string, tag: string, checksum: string): Container;
```
```Typescript
ocean.compute.createClusterAttributes(type: string, url: string): Cluster;
```
```Typescript
ocean.compute.createProviderAttributes(type: string, description: string, cluster: Cluster, containers: Container[], servers: Server[]): {
        type: string;
        description: string;
        environment: {
            cluster: Cluster;
            supportedServers: Server[];
            supportedContainers: Container[];
        };
    };
```
```Typescript
ocean.compute.createComputeService(consumerAccount: Account, cost: string, datePublished: string, providerAttributes: any, computePrivacy?: ServiceComputePrivacy, timeout?: number, providerUri?: string): ServiceCompute;
```
```Typescript
ocean.compute.order(consumerAccount: string, datasetDid: string, serviceIndex: number, algorithmDid?: string, algorithmMeta?: MetadataAlgorithm, mpAddress?: string): SubscribablePromise<OrderProgressStep, string>;
```