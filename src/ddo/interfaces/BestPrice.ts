export interface BestPrice {
  type: 'pool' | 'exchange' | ''
  address: string
  value: number
  isConsumable: 'true' | 'false' | ''
  ocean?: number
  datatoken?: number
  pools: string[]
}
