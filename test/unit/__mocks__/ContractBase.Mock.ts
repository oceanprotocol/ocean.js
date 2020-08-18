import ContractBase from '../../../src/datatokens/contracts/ContractBase'

export default class ContractBaseMock extends ContractBase {
  public async initMock(config: any) {
    await this.init(config)
  }

  public async callMock(name: string, args: any[], from?: string) {
    return this.call(name, args, from)
  }

  public async sendMock(name: string, from: string, args: any[]) {
    return this.send(name, from, args)
  }
}
