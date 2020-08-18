export interface MetadataAlgorithm {
  url?: string
  rawcode?: string
  language?: string
  format?: string
  version?: string
  container: {
    entrypoint: string
    image: string
    tag: string
  }
}
