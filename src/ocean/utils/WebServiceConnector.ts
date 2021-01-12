import { BodyInit, RequestInit, Response } from 'node-fetch'
import fs from 'fs'
import { Logger } from '../../utils'
import save from 'save-file'
// import { createWriteStream } from 'streamsaver'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetch = require('node-fetch')

/**
 * Provides a common interface to web services.
 */
export class WebServiceConnector {
  public logger: Logger
  constructor(logger: Logger) {
    this.logger = logger
  }

  public post(url: string, payload: BodyInit): Promise<Response> {
    return this.fetch(url, {
      method: 'POST',
      body: payload,
      headers: {
        'Content-type': 'application/json'
      }
    })
  }

  public get(url: string): Promise<Response> {
    return this.fetch(url, {
      method: 'GET',
      headers: {
        'Content-type': 'application/json'
      }
    })
  }

  public put(url: string, payload: BodyInit): Promise<Response> {
    return this.fetch(url, {
      method: 'PUT',
      body: payload,
      headers: {
        'Content-type': 'application/json'
      }
    })
  }

  public delete(url: string, payload?: BodyInit): Promise<Response> {
    if (payload != null) {
      return this.fetch(url, {
        method: 'DELETE',
        body: payload,
        headers: {
          'Content-type': 'application/json'
        }
      })
    } else {
      return this.fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-type': 'application/json'
        }
      })
    }
  }

  public async downloadFile(
    url: string,
    destination?: string,
    index?: number
  ): Promise<void> {
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
