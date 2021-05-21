export default function reduceDecimals(number) {
  return String(parseFloat(number).toFixed(18))
}
