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

export interface OceanPlatformVersions {
    lib: OceanPlatformTech
    aquarius: OceanPlatformTech
    brizo: OceanPlatformTech
    status: {
        ok: boolean
    }
}

/**
 * Versions submodule of Ocean Protocol.
 */
export class Versions extends Instantiable {
    /**
     * Returns the instance of OceanVersions.
     * @return {Promise<OceanVersions>}
     */
    public static async getInstance(config: InstantiableConfig): Promise<Versions> {
        const instance = new Versions()
        instance.setInstanceConfig(config)

        return instance
    }

    public async get(): Promise<OceanPlatformVersions> {
        const versions = {} as OceanPlatformVersions

        // Squid
        versions.lib = {
            name: 'Lib',
            version: metadata.version,
            commit: metadata.commit,
            status: OceanPlatformTechStatus.Working
        }

        // Brizo
        try {
            const {
                network,
                software: name,
                version
            } = await this.ocean.brizo.getVersionInfo()
            versions.brizo = {
                name,
                status: OceanPlatformTechStatus.Working,
                version
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
        const techs: OceanPlatformTech[] = Object.values(versions as any)

        versions.status = {
            ok: !techs.find(({ status }) => status !== OceanPlatformTechStatus.Working)
        }

        return versions
    }
}
