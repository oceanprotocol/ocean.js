import fetch from 'cross-fetch'
import { LoggerInstance } from '.'
import { DownloadResponse } from '../@types'

export async function fetchData(url: string, opts: RequestInit): Promise<Response> {
  const result = await fetch(url, opts)
  if (!result.ok) {
    LoggerInstance.error(`Error requesting [${opts.method}] ${url}`)
    LoggerInstance.error(`Response message: \n${await result.text()}`)
    throw result
  }
  return result
}

export async function downloadFileBrowser(url: string): Promise<void> {
  const anchor = document.createElement('a')
  anchor.download = ''
  anchor.href = url
  anchor.click()
}

export async function downloadFile(
  url: string,
  index?: number
): Promise<DownloadResponse> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Response error.')
  }
  let filename: string
  try {
    filename = response.headers
      .get('content-disposition')
      .match(/attachment;filename=(.+)/)[1]
  } catch {
    try {
      filename = url.split('/').pop()
    } catch {
      filename = `file${index}`
    }
  }

  return { data: await response.arrayBuffer(), filename }
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
