/**
 * Simple blocking sleep function
 * @param {number} ms - Number of miliseconds to wait
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
