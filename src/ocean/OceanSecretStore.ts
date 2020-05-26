import SecretStore from '@oceanprotocol/secret-store-client'
import SecretStoreConfig from '@oceanprotocol/secret-store-client/dist/models/SecretStoreConfig'

import Account from './Account'
import { noDidPrefixed } from '../utils'
import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * SecretStore submodule of Ocean Protocol.
 */
export class OceanSecretStore extends Instantiable {
    /**
     * Returns the instance of OceanSecretStore.
     * @return {Promise<OceanSecretStore>}
     */
    public static async getInstance(
        config: InstantiableConfig
    ): Promise<OceanSecretStore> {
        const instance = new OceanSecretStore()
        instance.setInstanceConfig(config)

        return instance
    }

    /**
     * Encrypt the given text and store the encryption keys using the `did`.
     * The encrypted text can be decrypted using the same keys identified by the `did`.
     * @param  {string}          did       Decentralized ID.
     * @param  {string}          content   Content to be encrypted.
     * @param  {string}          publisher Publisher account.
     * @return {Promise<string>}           Encrypted text.
     */
    public async encrypt(
        did: string,
        document: any,
        publisher: Account
    ): Promise<string> {
        const signature =
            (await publisher.getToken()) ||
            (await this.ocean.utils.signature.signText(
                noDidPrefixed(did),
                publisher.getId(),
                publisher.getPassword()
            ))

        return this.ocean.brizo.encrypt(
            noDidPrefixed(did),
            signature,
            document,
            publisher.getId()
        )
    }

    /**
     * Decrypt an encrypted text using the stored encryption keys associated with the `did`.
     * Decryption requires that the account owner has access permissions for this `did`
     * @param  {string}          did      Decentralized ID.
     * @param  {string}          content  Content to be encrypted.
     * @param  {string}          consumer cONSUMER account.
     * @return {Promise<string>}          Encrypted text.
     */
    public async decrypt(
        did: string,
        content: string,
        consumer?: Account,
        secretStoreUrl?: string
    ): Promise<any> {
        return this.getSecretStoreByAccount(consumer, secretStoreUrl).decryptDocument(
            noDidPrefixed(did),
            content
        )
    }

    private getSecretStoreByAccount(account: Account, secretStoreUrl?: string) {
        const config: any = { ...this.config }
        if (account) {
            config.address = account.getId()
        }
        if (account && account.getPassword()) {
            config.password = account.getPassword()
        }
        if (secretStoreUrl) {
            config.secretStoreUri = secretStoreUrl
        }
        return this.getSecretStore(config)
    }

    private getSecretStore(config: SecretStoreConfig): SecretStore {
        const { secretStoreUri, parityUri, password, address, threshold } = config
        config = { secretStoreUri, parityUri, password, address, threshold }

        return new SecretStore(config)
    }
}
