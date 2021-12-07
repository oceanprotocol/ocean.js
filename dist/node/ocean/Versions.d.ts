import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export declare enum OceanPlatformTechStatus {
    Loading = "Loading",
    Unknown = "Unknown",
    Stopped = "Stopped",
    Working = "Working"
}
export interface OceanPlatformTech {
    name: string;
    version?: string;
    commit?: string;
    status: OceanPlatformTechStatus;
}
export interface OceanPlatformVersions {
    lib: OceanPlatformTech;
    metadataCache: OceanPlatformTech;
    provider: OceanPlatformTech;
    status: {
        ok: boolean;
    };
}
export declare class Versions extends Instantiable {
    static getInstance(config: InstantiableConfig): Promise<Versions>;
    get(): Promise<OceanPlatformVersions>;
}
