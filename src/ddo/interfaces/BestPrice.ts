export interface BestPrice {
  type: 'pool' | 'exchange'
  address: string
  value: number
  ocean?: number
  datatoken?: number
}
