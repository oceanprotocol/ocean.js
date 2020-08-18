import DID from '../DID'

export interface ComputeJob {
  owner: string
  did: string
  jobId: string
  dateCreated: string
  dateFinished: string
  status: number
  statusText: string
  algorithmLogUrl: string
  resultsUrls: string[]
  resultsDid?: DID
}
