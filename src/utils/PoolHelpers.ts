import Decimal from 'decimal.js'
import { Pool } from '..'

export function calcMaxSwapExactOut(balance: string): Decimal {
  return new Decimal(balance).div(3.01)
}

export function calcMaxSwapExactIn(balance: string): Decimal {
  return new Decimal(balance).div(2.01)
}
export async function getMaxSwapExactOut(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)
  return calcMaxSwapExactOut(reserve)
}

export async function getMaxSwapExactIn(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)
  return calcMaxSwapExactIn(reserve)
}

export async function getMaxAddLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)

  return calcMaxSwapExactIn(reserve)
}

export async function getMaxRemoveLiquidity(
  poolInstance: Pool,
  poolAddress: string,
  tokenAddress: string
): Promise<Decimal> {
  const reserve = await poolInstance.getReserve(poolAddress, tokenAddress)

  return calcMaxSwapExactIn(reserve)
}
