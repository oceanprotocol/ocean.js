import Decimal from 'decimal.js'

export function calcMaxExactOut(balance: string): Decimal {
  return new Decimal(balance).div(2)
}

export function calcMaxExactIn(balance: string): Decimal {
  return new Decimal(balance).div(2)
}
