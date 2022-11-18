export function getErrorMessage(error: string): string {
  const errorOnj = error.split('_')
  const resource = errorOnj?.[0]
  const message = errorOnj?.at(-1)
  return `${message} has failed for the following component: ${resource}`
}
