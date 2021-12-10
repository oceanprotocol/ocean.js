import { Response } from 'node-fetch'
import fs from 'fs'
import { Logger } from '../../utils'
import save from 'save-file'
import timeoutSignal from '../../utils/Timeout'
const fetch = require('cross-fetch')

/**
 * Provides a common interface to web services.
 */
export class WebServiceConnector {
  public logger: Logger
  public requestTimeout: number = 5000
  constructor(logger: Logger, requestTimeout?: number) {
    this.logger = logger
    this.requestTimeout = requestTimeout || this.requestTimeout
  }

  public post(url: string, payload: BodyInit): Promise<Response> {
    const headers = {
      'Content-type': 'application/json'
    }
    return this.postWithHeaders(url, payload, headers)
  }

  public postWithOctet(url: string, payload: BodyInit): Promise<Response> {
    const headers = {
      'Content-type': 'application/octet-stream'
    }
    return this.postWithHeaders(url, payload, headers)
  }

  public postWithHeaders(
    url: string,
    payload: BodyInit,
    headers: any
  ): Promise<Response> {
    if (payload != null) {
      return this.fetch(url, {
        method: 'POST',
        body: payload,
        headers,
        signal: timeoutSignal(this.requestTimeout)
      })
    } else {
      return this.fetch(url, {
        method: 'POST',
        signal: timeoutSignal(this.requestTimeout)
      })
    }
  }

  public get(url: string): Promise<Response> {
    return this.fetch(url, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json'
      },
      signal: timeoutSignal(this.requestTimeout)
    })
  }

  public put(url: string, payload: BodyInit): Promise<Response> {
    if (payload != null) {
      return this.fetch(url, {
        method: 'PUT',
        body: payload,
        headers: {
          'Content-type': 'application/json'
        },
        signal: timeoutSignal(this.requestTimeout)
      })
    } else {
      return this.fetch(url, {
        method: 'PUT',
        headers: {
          'Content-type': 'application/json'
        },
        signal: timeoutSignal(this.requestTimeout)
      })
    }
  }

  public delete(url: string, payload?: BodyInit): Promise<Response> {
    if (payload != null) {
      return this.fetch(url, {
        method: 'DELETE',
        body: payload,
        headers: {
          'Content-type': 'application/json'
        },
        signal: timeoutSignal(this.requestTimeout)
      })
    } else {
      return this.fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json'
        },
        signal: timeoutSignal(this.requestTimeout)
      })
    }
  }

  public async downloadFile(
    url: string,
    destination?: string,
    index?: number
  ): Promise<string> {
    const response = await this.get(url)
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

    if (destination) {
      // eslint-disable-next-line no-async-promise-executor
      await new Promise(async (resolve, reject) => {
        fs.mkdirSync(destination, { recursive: true })
        const fileStream = fs.createWriteStream(`${destination}${filename}`)
        response.body.pipe(fileStream)
        response.body.on('error', reject)
        fileStream.on('finish', resolve)
      })

      return destination
    } else {
      save(await response.arrayBuffer(), filename)
    }
  }

  public async downloadFileBrowser(url: string): Promise<void> {
    const anchor = document.createElement('a')
    anchor.download = ''
    anchor.href = url
    anchor.click()
  }

  private async fetch(url: string, opts: RequestInit): Promise<Response> {
    const result = await fetch(url, opts)
    if (!result.ok) {
      this.logger.error(`Error requesting [${opts.method}] ${url}`)
      this.logger.error(`Response message: \n${await result.text()}`)
      throw result
    }
    return result
  }
}
