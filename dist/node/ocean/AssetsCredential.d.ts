import { DDO } from '../ddo/DDO';
import { Credentials, CredentialAction } from '../ddo/interfaces/Credentials';
export declare function checkCredentialExist(credentials: Credentials, credentialType: string, credentialAction: CredentialAction): boolean;
export declare function removeCredentialDetail(ddo: DDO, credentialType: string, credentialAction: CredentialAction): DDO;
export declare function updateCredentialDetail(ddo: DDO, credentialType: string, list: string[], credentialAction: CredentialAction): DDO;
export declare function addCredentialDetail(ddo: DDO, credentialType: string, list: string[], credentialAction: CredentialAction): DDO;
