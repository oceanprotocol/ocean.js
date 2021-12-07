export interface PublicKey {
    id: string;
    type: 'Ed25519VerificationKey2018' | 'RsaVerificationKey2018' | 'EdDsaSAPublicKeySecp256k1' | 'EthereumECDSAKey';
    owner: string;
    publicKeyPem?: string;
    publicKeyBase58?: string;
    publicKeyHex?: string;
}
