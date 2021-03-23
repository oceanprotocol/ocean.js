# Overview

Here is a quick overview of the main functions and submodules:

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
```
ocean.pool
```

# Fixed rate exchange
Create, price, buy datatokens  
```
ocean.exchange
```

# Compute-to-data
consume/start, stop, results, status, define-service
```
ocean.compute
```