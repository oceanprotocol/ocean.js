import { Ocean } from '../../src/ocean/Ocean'
const fetch = require('cross-fetch')

export function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function waitForAqua(ocean: Ocean, did: string) {
  const apiPath = '/api/v1/aquarius/assets/ddo'
  let tries = 0
  do {
    try {
      const result = await fetch(ocean.metadataCache.getURI() + apiPath + '/' + did)
      if (result.ok) {
        break
      }
    } catch (e) {
      // do nothing
    }
    await sleep(1500)
    tries++
  } while (tries < 100)
}
