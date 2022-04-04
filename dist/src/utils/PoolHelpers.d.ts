import Decimal from 'decimal.js';
import { Pool } from '..';
export declare function calcMaxExactOut(balance: string): Decimal;
export declare function calcMaxExactIn(balance: string): Decimal;
export declare function getMaxSwapExactOut(poolInstance: Pool, poolAddress: string, tokenAddress: string): Promise<Decimal>;
export declare function getMaxSwapExactIn(poolInstance: Pool, poolAddress: string, tokenAddress: string): Promise<Decimal>;
export declare function getMaxAddLiquidity(poolInstance: Pool, poolAddress: string, tokenAddress: string): Promise<Decimal>;
export declare function getMaxRemoveLiquidity(poolInstance: Pool, poolAddress: string, tokenAddress: string): Promise<Decimal>;
