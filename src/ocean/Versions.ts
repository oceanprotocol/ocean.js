import * as OceanPackageJson from '@oceanprotocol/ocean-contracts/package.json'
import * as metadata from '../metadata.json'

import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

export enum OceanPlatformTechStatus {
    Loading = 'Loading',
    Unknown = 'Unknown',
    Stopped = 'Stopped',
    Working = 'Working'
}

export interface OceanPlatformTech {
    name: string
    version?: string
    commit?: string
    status: OceanPlatformTechStatus
}

export interface OceanPlatformContractsTech extends OceanPlatformTech {
    network?: string
    ContractsVersion?: string
    contracts?: { [contractName: string]: string }
}

export interface OceanPlatformVersions {
    lib: OceanPlatformContractsTech
    metadataStore: OceanPlatformTech
    provider: OceanPlatformContractsTech
    status: {
        ok: boolean
        contracts: boolean
        network: boolean
    }
}

/**
 * Versions submodule of Ocean Protocol.
 */
export class Versions extends Instantiable {
    /**
     * Returns the instance of Ocean Stack Versions.
     * @return {Promise<Versions>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<Versions> {
        const instance = new Versions()
        instance.setInstanceConfig(config)
        return instance
    }

    public async get(): Promise<OceanPlatformVersions> {
        const versions = {} as OceanPlatformVersions

        versions.lib = {
            name: 'Ocean-lib-js',
            version: metadata.version,
            commit: metadata.commit,
            status: OceanPlatformTechStatus.Working,
            network:(await this.ocean.network.getNetworkName()).toLowerCase(),
            ContractsVersion: OceanPackageJson.version,
            contracts: {}
        }

        // Provider
        try {
            const {
                contracts,
                contractsVersion,
                network,
                software: name,
                version
            } = await this.ocean.provider.getVersionInfo()

            versions.provider = {
                name,
                status: OceanPlatformTechStatus.Working,
                version,
                contracts,
                network,
                ContractsVersion: contractsVersion
            }
        } catch {
            versions.provider = {
                name: 'Provider',
                status: OceanPlatformTechStatus.Stopped
            }
        }

        // MetadataStore
        try {
            const { software: name, version } = await this.ocean.metadataStore.getVersionInfo()
            versions.metadataStore = {
                name,
                status: OceanPlatformTechStatus.Working,
                version
            }
        } catch {
            versions.metadataStore = {
                name: 'MetadataStore',
                status: OceanPlatformTechStatus.Stopped
            }
        }

        // Status
        const techs: OceanPlatformContractsTech[] = Object.values(versions as any)

        const networks = techs
            .map(({ network }) => network)
            .filter(_ => !!_)
            .reduce((acc, network) => ({ ...acc, [network]: true }), {})

        let contractStatus = true
        const contractList = techs.map(({ contracts }) => contracts).filter(_ => !!_)
        Array.from(contractList.map(Object.keys))
            .reduce((acc, _) => [...acc, ..._], [])
            .filter((_, i, list) => list.indexOf(_) === i)
            .forEach(name => {
                let address
                contractList
                    .map(_ => _[name])
                    .forEach(_ => {
                        if (!address) {
                            address = _
                            return
                        }
                        if (address !== _) {
                            this.logger.warn(`Error on contract ${name}`)
                            contractStatus = false
                        }
                    })
            })

        versions.status = {
            ok: !techs.find(({ status }) => status !== OceanPlatformTechStatus.Working),
            network: Object.keys(networks).length === 1,
            contracts: contractStatus
        }

        return versions
    }
}
