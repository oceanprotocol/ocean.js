import Decimal from 'decimal.js'
import { Pool } from '../contracts'

export function calcMaxExactOut(balance: string): Decimal {
  return new Decimal(balance).div(2)
}

export function calcMaxExactIn(balance: string): Decimal {
  return new Decimal(balance).div(2)
}

export async function getMaxSwapExactOut(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)
  return calcMaxExactOut(reserve)
}

export async function getMaxSwapExactIn(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)
  return calcMaxExactIn(reserve)
}

export async function getMaxAddLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)

  return calcMaxExactIn(reserve)
}

export async function getMaxRemoveLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)

  return calcMaxExactIn(reserve)
}
