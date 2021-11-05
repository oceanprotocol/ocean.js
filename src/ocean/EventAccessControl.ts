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

  public async isPermit(
    component: string,
    eventType: string,
    authService: string,
    credentials: string,
    did?: string
  ): Promise<boolean> {
    if (!this.url) return true
    let args
    if (eventType === 'consume') {
      args = {
        component,
        eventType,
        authService,
        did,
        credentials: {
          type: authService,
          value: credentials
        }
      }
    } else {
      args = {
        component,
        eventType,
        authService,
        credentials: {
          type: authService,
          value: credentials
        }
      }
    }

    try {
      const response = await this.ocean.utils.fetch.post(this.url, JSON.stringify(args))
      const results = await response.json()
      return results === 'true'
    } catch (e) {
      this.logger.error(e)
      throw new Error('Asset URL not found or not available.')
    }
  }
}
