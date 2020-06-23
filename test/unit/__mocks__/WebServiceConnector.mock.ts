import { WebServiceConnector } from '../../../src/ocean/utils/WebServiceConnector'

// @ts-ignore
export default class WebServiceConnectorMock extends WebServiceConnector {
    constructor(private returnData: any) {
        super()
    }

    // @ts-ignore
    private async fetch(url, opts): Promise<any> {
        return new Promise((resolve, reject) => {
            resolve({
                ok: true,
                json: () => {
                    return this.returnData ? this.returnData : {}
                },
                text: () => {
                    return this.returnData
                        ? JSON.stringify(this.returnData.toString())
                        : ''
                }
            })
        })
    }
}
