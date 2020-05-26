import * as keeperPackageJson from '@oceanprotocol/keeper-contracts/package.json'
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

export interface OceanPlatformKeeperTech extends OceanPlatformTech {
    network?: string
    keeperVersion?: string
    contracts?: { [contractName: string]: string }
}

export interface OceanPlatformVersions {
    squid: OceanPlatformKeeperTech
    aquarius: OceanPlatformTech
    brizo: OceanPlatformKeeperTech
    status: {
        ok: boolean
        contracts: boolean
        network: boolean
    }
}

/**
 * Versions submodule of Ocean Protocol.
 */
export class OceanVersions extends Instantiable {
    /**
     * Returns the instance of OceanVersions.
     * @return {Promise<OceanVersions>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<OceanVersions> {
        const instance = new OceanVersions()
        instance.setInstanceConfig(config)

        return instance
    }

    public async get(): Promise<OceanPlatformVersions> {
        const versions = {} as OceanPlatformVersions

        // Squid
        versions.squid = {
            name: 'Squid-js',
            version: metadata.version,
            commit: metadata.commit,
            status: OceanPlatformTechStatus.Working,
            network: (await this.ocean.keeper.getNetworkName()).toLowerCase(),
            keeperVersion: keeperPackageJson.version,
            contracts: Object.values(await this.ocean.keeper.getAllInstances())
                .filter(_ => !!_)
                .reduce(
                    (acc, { contractName, address }) => ({
                        ...acc,
                        [contractName]: address
                    }),
                    {}
                )
        }

        // Brizo
        try {
            const {
                contracts,
                'keeper-version': keeperVersion,
                network,
                software: name,
                version
            } = await this.ocean.brizo.getVersionInfo()
            versions.brizo = {
                name,
                status: OceanPlatformTechStatus.Working,
                version,
                contracts,
                network,
                keeperVersion: keeperVersion.replace(/^v/, '')
            }
        } catch {
            versions.brizo = {
                name: 'Brizo',
                status: OceanPlatformTechStatus.Stopped
            }
        }

        // Aquarius
        try {
            const { software: name, version } = await this.ocean.aquarius.getVersionInfo()
            versions.aquarius = {
                name,
                status: OceanPlatformTechStatus.Working,
                version
            }
        } catch {
            versions.aquarius = {
                name: 'Aquarius',
                status: OceanPlatformTechStatus.Stopped
            }
        }

        // Status
        const techs: OceanPlatformKeeperTech[] = Object.values(versions as any)

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
