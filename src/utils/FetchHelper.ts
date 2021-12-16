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

export async function getData(url: string): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    headers: {
      'Content-type': 'application/json'
    }
  })
}

async function postWithHeaders(
  url: string,
  payload: BodyInit,
  headers: any
): Promise<Response> {
  if (payload != null) {
    return fetch(url, {
      method: 'POST',
      body: payload,
      headers
    })
  } else {
    return fetch(url, {
      method: 'POST'
    })
  }
}

export async function postData(url: string, payload: BodyInit): Promise<Response> {
  const headers = {
    'Content-type': 'application/json'
  }
  return postWithHeaders(url, payload, headers)
}
