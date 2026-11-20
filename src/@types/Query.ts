// Ocean Node DDO search filters (docs/database.md in ocean-node). Unset filters add no condition.
export interface AssetFilter {
  chainIds?: number[]
  versions?: string[]
  ids?: string[]
  excludeIds?: string[]
  excludeNftAddresses?: string[]
  owners?: string[]
  anyOf?: { ids?: string[]; owners?: string[]; datatokenAddresses?: string[] }[]
  types?: ('dataset' | 'algorithm')[]
  serviceTypes?: ('access' | 'compute')[]
  datatokenAddresses?: string[]
  tags?: string[]
  text?: string
  nftStates?: number[]
  includeUnlisted?: boolean
  includePurgatory?: boolean
  priceTypes?: string[]
  excludePriceTypes?: string[]
  createdAfter?: string // ISO date
  serviceEndpoints?: string[]
  dataspace?: string
  trustedAlgorithm?: { did: string; serviceId: string }
  trustedAlgorithmPublisher?: string
  indexedOnly?: boolean
}

// `page` starts at 1; page x size is 10000 at most
export type SearchQuery =
  | {
      type?: 'assets'
      filter?: AssetFilter
      sort?: {
        by: 'created' | 'orders' | 'price' | 'tokenSymbol' | 'relevance'
        order?: 'asc' | 'desc'
      }
      page?: number
      size?: number
    }
  | {
      type: 'orders'
      filter: { consumer: string } | { payer: string }
      page?: number
      size?: number
    }
  | { type: 'tags'; filter?: AssetFilter; size?: number }

export interface QueryResult<T = any> {
  results: T[]
  totalResults: number
}
