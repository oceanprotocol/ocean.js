export interface RemoteSource {
  type: string
  url?: string
  method?: string
  headers?: string | Record<string, string | number | boolean>
  ipfsCid?: string
}
