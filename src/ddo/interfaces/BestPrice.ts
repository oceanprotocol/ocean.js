export interface BestPrice {
  type: 'pool' | 'exchange' | ''
  address: string
  value: number
  isConsumable?: 'true' | 'false' | ''
  ocean?: number
  datatoken?: number
  // eslint-disable-next-line camelcase
  exchange_id?: string
  pools: string[]
}
