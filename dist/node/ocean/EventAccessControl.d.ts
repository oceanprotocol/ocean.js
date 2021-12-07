import { Instantiable, InstantiableConfig } from '../Instantiable.abstract';
export declare class EventAccessControl extends Instantiable {
    private baseUrl;
    static getInstance(config: InstantiableConfig): Promise<EventAccessControl>;
    setBaseUrl(url: string): Promise<void>;
    get url(): string;
    private getIsPermitArgs;
    isPermit(component: string, eventType: string, authService: string, credentials: string, credentialsType: string, did?: string): Promise<boolean>;
}
