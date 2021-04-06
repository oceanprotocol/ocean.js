import DID from '../DID'

export interface ComputeJob {
  owner: string
  dids: string[]
  jobId: string
  dateCreated: string
  dateFinished: string
  status: number
  statusText: string
  algorithmLogUrl: string
  resultsUrl: string[]
  resultsDid?: DID
}
