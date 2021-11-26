import fetch from 'cross-fetch'
import LoggerInstance from './Logger'

export async function fetchData(url: string, opts: RequestInit): Promise<Response> {
  const result = await fetch(url, opts)
  if (!result.ok) {
    LoggerInstance.error(`Error requesting [${opts.method}] ${url}`)
    LoggerInstance.error(`Response message: \n${await result.text()}`)
    throw result
  }
  return result
}
