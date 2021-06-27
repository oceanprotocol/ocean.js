import Decimal from 'decimal.js'
export default function reduceDecimals(number: string, decimal = 18) {
  Decimal.set({ toExpNeg: -decimal, precision: decimal, rounding: 1 })
  return String(new Decimal(number))
}
