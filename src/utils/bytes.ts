// no 0x prefix
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// Native `fetch` (undici / browsers) exposes `response.body` as a WHATWG
// ReadableStream<Uint8Array>, unlike node-fetch v2 which returned a Node Readable.
// `for await` over a ReadableStream works in Node 20+ but not in current browsers,
// so wrap it in a portable async iterable used by every streaming-response method.
export function responseBodyToAsyncIterable(
  body: ReadableStream<Uint8Array> | null
): AsyncIterable<Uint8Array> {
  if (!body) return (async function* () {})()
  if (typeof (body as any)[Symbol.asyncIterator] === 'function') {
    return body as unknown as AsyncIterable<Uint8Array>
  }
  return (async function* () {
    const reader = body.getReader()
    let reachedEnd = false
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) {
          reachedEnd = true
          break
        }
        if (value) yield value
      }
    } finally {
      // If the consumer stopped early (break/return/throw before EOF), cancel the
      // stream so the underlying socket is closed; releaseLock alone would leak it.
      // On normal EOF the stream is already closed, so skip the cancel.
      if (!reachedEnd) reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  })()
}

export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}
