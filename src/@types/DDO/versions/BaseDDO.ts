export interface BaseDDOType {
  /**
   * Contexts used for validation.
   * @type {string[]}
   */
  '@context': string[]

  /**
   * Version information in SemVer notation
   * referring to the DDO spec version
   * @type {string}
   */
  version: string
}
