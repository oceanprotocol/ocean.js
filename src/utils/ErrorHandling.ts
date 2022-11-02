export function getErrorMessage(resource: string, message: string): string {
  return `${message} has failed for the following component: ${resource}`
}
