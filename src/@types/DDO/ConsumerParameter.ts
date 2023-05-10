export interface ConsumerParameter {
  /**
   * Parameter name.
   * @type {string}
   */
  name: string

  /**
   * Field type.
   * @type {'text' | 'number' | 'boolean' | 'select'}
   */
  type: 'text' | 'number' | 'boolean' | 'select'

  /**
   * Displayed field label.
   * @type {string}
   */
  label: string

  /**
   * Defines if customer input for this field is mandatory.
   * @type {boolean}
   */
  required: boolean

  /**
   * Field description.
   * @type {string}
   */
  description: string

  /**
   * Field default value. For select types, string key of default option.
   * @type {string}
   */
  default: string

  /**
   * For select types, a list of options.
   * @type {string}
   */
  options?: string
}
