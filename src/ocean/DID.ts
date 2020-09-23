import { noZeroX } from '../utils'
const prefix = 'did:op:'

/**
 * Decentralized ID.
 */
export default class DID {
  /**
   * Parses a DID from a string.
   * @param  {string} didString DID in string.
   * @return {DID}
   */
  public static parse(didString: string | DID): DID {
    if (didString instanceof DID) {
      didString = didString.getDid()
    }
    let did: DID
    const didMatch = didString.match(/^did:op:([a-f0-9]{40})$/i)
    if (didMatch) {
      did = new DID(didMatch[1])
    }

    if (!did) {
      throw new Error(`Parsing DID failed, ${didString}`)
    }

    return did
  }

  /**
   * Generate a new DID.
   * @param  {string} dataTokenAddress Address of data token to use for DID.
   * @return {DID}
   */
  public static generate(dataTokenAddress: string): DID {
    return new DID(noZeroX(dataTokenAddress))
  }

  /**
   * ID.
   * @type {string}
   */
  private id: string

  private constructor(id: string) {
    this.id = id
  }

  /**
   * Returns the DID.
   * @return {string}
   */
  public getDid(): string {
    return `${prefix}${this.id}`
  }

  /**
   * Returns the ID.
   * @return {string}
   */
  public getId(): string {
    return this.id
  }
}
