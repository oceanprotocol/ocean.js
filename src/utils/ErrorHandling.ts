export function getErrorMessage(error: Object): string {
  console.log('lib error', error)
  const resource = Object.keys(error)[0]
  console.log('lib resource', resource)
  const message = error[resource]
  console.log('lib message', message)
  return `${message} has failed for the following component: ${resource}`
}
