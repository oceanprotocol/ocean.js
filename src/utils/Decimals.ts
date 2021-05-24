import Decimal from 'decimal.js'
export default function reduceDecimals(number: string) {
  Decimal.set({ toExpNeg: -18, precision: 18, rounding: 1 })
  return String(new Decimal(number))
}
