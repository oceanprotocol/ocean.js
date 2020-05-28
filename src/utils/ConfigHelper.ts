export interface ConfigHelper {
    network: string,
    url: string,
    factoryAddress: string
}


const configs = [
    { network: 'development', url: 'http://localhost:8545', factoryAddress: null },
    { network: 'pacific', url: 'https://pacific.oceanprotocol.com', factoryAddress: '0x1234' },
    { network: 'mainnet', url: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID', factoryAddress: '0x1234' }

]



export class ConfigHelper {
    public getConfig(network: string): ConfigHelper {
        const confighelp = new ConfigHelper
        //fill unknown values
        confighelp.factoryAddress = null
        confighelp.url = null
        confighelp.network = network
        const knownconfig = configs.find(c => c.network === network)
        if (knownconfig) {
            confighelp.factoryAddress = knownconfig.factoryAddress
            confighelp.url = knownconfig.url
            confighelp.network = knownconfig.network
        }
        return (confighelp)

    }
}