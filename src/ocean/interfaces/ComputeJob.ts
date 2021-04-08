import DID from '../DID'

export interface ComputeJob {
  owner: string
  jobId: string
  dateCreated: string
  dateFinished: string
  status: number
  statusText: string
  algorithmLogUrl: string
  resultsUrl: string[]
  resultsDid?: DID
  inputDID?: string[]
  algoDID?: string
}
