/**
 * Simple blocking sleep function
 */
export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
