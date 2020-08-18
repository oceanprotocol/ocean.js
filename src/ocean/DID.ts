import { generateId } from '../utils/GeneratorHelpers'

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
    const didMatch = didString.match(/^did:op:([a-f0-9]{64})$/i)

    if (didMatch) {
      did = new DID(didMatch[1])
    }

    if (!did) {
      throw new Error(`Parsing DID failed, ${didString}`)
    }

    return did
  }

  /**
   * Returns a new DID.
   * @return {DID}
   */
  public static generate(): DID {
    return new DID(generateId())
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
