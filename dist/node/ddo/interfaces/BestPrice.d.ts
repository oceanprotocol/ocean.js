export interface BestPrice {
    type: 'pool' | 'exchange' | 'free' | '';
    address: string;
    value: number;
    isConsumable?: 'true' | 'false' | '';
    ocean?: number;
    datatoken?: number;
    exchange_id?: string;
    pools: string[];
}
