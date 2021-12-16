import { Instantiable, InstantiableConfig } from '../Instantiable.abstract'

/**
 * Provides an interface for Event access control service.
 */
export class EventAccessControl extends Instantiable {
  private baseUrl: string
  /**
   * Returns the instance of Event access Control.
   * @return {Promise<EventAccessControl>}
   */
  public static async getInstance(
    config: InstantiableConfig
  ): Promise<EventAccessControl> {
    const instance = new EventAccessControl()
    instance.setInstanceConfig(config)
    await instance.setBaseUrl(config.config?.rbacUri)
    return instance
  }

  public async setBaseUrl(url: string) {
    this.baseUrl = url
  }

  public get url(): string {
    return this.baseUrl
  }

  private getIsPermitArgs(
    component: string,
    eventType: string,
    authService: string,
    credentials: string,
    credentialsType: string,
    did?: string
  ) {
    if (eventType === 'consume') {
      return {
        component,
        eventType,
        authService,
        did,
        credentials: {
          type: credentialsType,
          value: credentials
        }
      }
    }
    return {
      component,
      eventType,
      authService,
      credentials: {
        type: credentialsType,
        value: credentials
      }
    }
  }

  public async isPermit(
    component: string,
    eventType: string,
    authService: string,
    credentials: string,
    credentialsType: string,
    did?: string
  ): Promise<boolean> {
    if (!this.url) return true
    const args = this.getIsPermitArgs(
      component,
      eventType,
      authService,
      credentials,
      credentialsType,
      did
    )

    try {
      const response = await this.ocean.utils.fetch.post(this.url, JSON.stringify(args))
      let results = await response.json()
      results = JSON.stringify(results)
      return results === 'true'
    } catch (e) {
      this.logger.error(e)
      throw new Error('ERROR: Asset URL not found or not available.')
    }
  }
}
