/**
 * The asset filters of the Ocean Node DDO search. A filter that is not set adds no
 * condition; all filters that are set must hold. Each filter covers DDO v4 and v5.
 * See the "DDO search" section of docs/database.md in oceanprotocol/ocean-node.
 */
export interface AssetFilter {
  chainIds?: number[]
  /** DDO versions, for example ['5.0.0'] */
  versions?: string[]
  ids?: string[]
  excludeIds?: string[]
  excludeNftAddresses?: string[]
  owners?: string[]
  /** in each group one of the lists must match; all groups must hold */
  anyOf?: { ids?: string[]; owners?: string[]; datatokenAddresses?: string[] }[]
  types?: ('dataset' | 'algorithm')[]
  serviceTypes?: ('access' | 'compute')[]
  datatokenAddresses?: string[]
  tags?: string[]
  /** each word in the name, description, author, tags, owner or datatoken; or a DID */
  text?: string
  nftStates?: number[]
  /** also give the unlisted assets (state 5) */
  includeUnlisted?: boolean
  includePurgatory?: boolean
  priceTypes?: string[]
  excludePriceTypes?: string[]
  /** ISO date */
  createdAfter?: string
  serviceEndpoints?: string[]
  dataspace?: string
  trustedAlgorithm?: { did: string; serviceId: string }
  trustedAlgorithmPublisher?: string
  /** only the DDOs that have indexedMetadata */
  indexedOnly?: boolean
}

/** A DDO search of Ocean Node. `page` starts at 1; `page` x `size` is 10000 at most. */
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

/** `results` holds DDOs, orders, or `{ tag, count }` for a tags search */
export interface QueryResult<T = any> {
  results: T[]
  totalResults: number
}
