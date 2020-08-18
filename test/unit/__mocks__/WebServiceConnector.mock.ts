import { WebServiceConnector } from '../../../src/ocean/utils/WebServiceConnector'
import { RequestInit } from 'node-fetch'

export default class WebServiceConnectorMock extends (WebServiceConnector as any) {
  constructor(private returnData: any) {
    super(returnData)
  }

  private async fetch(url: string, opts: RequestInit): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve({
        ok: true,
        json: () => {
          return this.returnData ? this.returnData : {}
        },
        text: () => {
          return this.returnData ? JSON.stringify(this.returnData.toString()) : ''
        }
      })
    })
  }
}
