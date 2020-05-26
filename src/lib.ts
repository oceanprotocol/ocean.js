import Config from './models/Config'
import Account from './ocean/Account'
import DID from './ocean/DID'
import { Ocean } from './ocean/Ocean'
import { LoggerInstance as Logger } from './utils/Logger'
import { Aquarius } from './aquarius/Aquarius'
import { DataTokens } from './datatokens/Datatokens'

import * as utils from './utils'

// Exports
export * from './metadata/Metadata'
export * from './metadata/MetadataInterfaces'

export { CreateProgressStep } from './ocean/OceanAssets'
export { ComputeJob, ComputeJobStatus } from './ocean/OceanCompute'
export { OrderProgressStep } from './ocean/utils/ServiceUtils'
export {
    OceanPlatformTechStatus,
    OceanPlatformTech,
    OceanPlatformKeeperTech,
    OceanPlatformVersions
} from './ocean/OceanVersions'

export { Ocean, Account, Config, DID, Logger, Aquarius, DataTokens, utils }
