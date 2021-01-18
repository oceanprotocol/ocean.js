import metadata from '../metadata.json'

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
  metadataCache: OceanPlatformTech
  provider: OceanPlatformTech
  status: {
    ok: boolean
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
      name: 'Lib',
      version: metadata.version,
      commit: metadata.commit,
      status: OceanPlatformTechStatus.Working
    }

    // MetadataCache
    try {
      const { software: name, version } = await this.ocean.metadataCache.getVersionInfo()
      versions.metadataCache = {
        name,
        status: OceanPlatformTechStatus.Working,
        version
      }
    } catch {
      versions.metadataCache = {
        name: 'MetadataCache',
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
