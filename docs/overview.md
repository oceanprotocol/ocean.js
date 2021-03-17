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
```
ocean.assets
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