import { RemoteObject } from './RemoteObject'

export interface License {
  name: string
  ODRL?: unknown
  licenseDocuments?: RemoteObject[]
}
