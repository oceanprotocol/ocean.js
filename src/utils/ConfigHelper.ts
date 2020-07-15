export interface ConfigHelper {
    network: string
    url: string
    factoryAddress: string
    oceanTokenAddress: string
}

const configs = [
    { network: 'development', url: 'http://localhost:8545', factoryAddress: null },
    {
        network: 'pacific',
        url: 'https://pacific.oceanprotocol.com',
        factoryAddress: '0x1234',
        oceanTokenAddress: '0x012578f9381e876A9E2a9111Dfd436FF91A451ae'
    },
    {
        network: 'mainnet',
        url: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
        factoryAddress: '0x1234',
        oceanTokenAddress: '0x985dd3d42de1e256d09e1c10f112bccb8015ad41'
    }
]

export class ConfigHelper {
    public getConfig(network: string): ConfigHelper {
        const confighelp = new ConfigHelper()
        // fill unknown values
        confighelp.factoryAddress = null
        confighelp.url = null
        confighelp.network = network
        confighelp.oceanTokenAddress = null
        const knownconfig = configs.find((c) => c.network === network)
        if (knownconfig) {
            confighelp.factoryAddress = knownconfig.factoryAddress
            confighelp.oceanTokenAddress = knownconfig.oceanTokenAddress
            confighelp.url = knownconfig.url
            confighelp.network = knownconfig.network
        }
        return confighelp
    }
}
