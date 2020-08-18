/**
 * Additional Information of Assets Metadata.
 * @see https://github.com/oceanprotocol/OEPs/tree/master/8#additional-information
 */
export interface AdditionalInformation {
  /**
   * Details of what the resource is. For a dataset, this attribute
   * explains what the data represents and what it can be used for.
   * @type {string}
   * @example "Weather information of UK including temperature and humidity"
   */
  description?: string

  /**
   * The party holding the legal copyright. Empty by default.
   * @type {string}
   * @example "Met Office"
   */
  copyrightHolder?: string

  /**
   * Example of the concept of this asset. This example is part
   * of the metadata, not an external link.
   * @type {string}
   * @example "423432fsd,51.509865,-0.118092,2011-01-01T10:55:11+00:00,7.2,68"
   */
  workExample?: string

  /**
   * Mapping of links for data samples, or links to find out more information.
   * Links may be to either a URL or another Asset. We expect marketplaces to
   * converge on agreements of typical formats for linked data: The Ocean Protocol
   * itself does not mandate any specific formats as these requirements are likely
   * to be domain-specific.
   * @type {any[]}
   * @example
   * [
   *    {
   *      anotherSample: "http://data.ceda.ac.uk/badc/ukcp09/data/gridded-land-obs/gridded-land-obs-daily/",
   *    },
   *    {
   *      fieldsDescription: "http://data.ceda.ac.uk/badc/ukcp09/",
   *    },
   *  ]
   */
  links?: { [name: string]: string }[]

  /**
   * The language of the content. Please use one of the language
   * codes from the {@link https://tools.ietf.org/html/bcp47 IETF BCP 47 standard}.
   * @type {String}
   * @example "en"
   */
  inLanguage?: string

  /**
   * Categories used to describe this content. Empty by default.
   * @type {string[]}
   * @example ["Economy", "Data Science"]
   */
  categories?: string[]

  /**
   * Keywords or tags used to describe this content. Empty by default.
   * @type {string[]}
   * @example ["weather", "uk", "2011", "temperature", "humidity"]
   */
  tags?: string[]

  /**
   * An indication of update latency - i.e. How often are updates expected (seldom,
   * annually, quarterly, etc.), or is the resource static that is never expected
   * to get updated.
   * @type {string}
   * @example "yearly"
   */
  updateFrequency?: string

  /**
   * A link to machine-readable structured markup (such as ttl/json-ld/rdf)
   * describing the dataset.
   * @type {StructuredMarkup[]}
   */
  structuredMarkup?: {
    uri: string
    mediaType: string
  }[]
}
