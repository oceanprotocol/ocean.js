import AbortController from 'node-abort-controller'

export default function timeoutSignal(timeout: number) {
  if (!Number.isInteger(timeout)) {
    throw new TypeError(`Expected an integer, got ${typeof timeout}`)
  }
  const signalMap = new WeakMap()
  const controller = new AbortController()

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  signalMap.set(controller.signal, timeoutId)
  // any is needed due to some type incompatibility
  return controller.signal as any
}
