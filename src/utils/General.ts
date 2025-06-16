/**
 * Simple blocking sleep function
 * @param {number} ms - Number of milliseconds to wait
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function isDefined(something: any): boolean {
  return something !== undefined && something !== null
}
