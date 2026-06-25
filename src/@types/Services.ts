import { ComputeResourceRequest } from './Compute.js'

// Service-on-Demand client types. Mirror of ocean-node
// `src/@types/C2D/ServiceOnDemand.ts` (the API surface a client interacts with).

// ── Resource requirements (templates) ─────────────────────────────────

export interface TemplateResourceRequirement {
  // Exactly one of `id` or `kind` is set.
  id?: string // exact resource id: 'cpu' | 'ram' | 'disk' | named GPU ('gpu-0')
  kind?: 'discrete' | 'fungible' // match ANY resource of this kind across the env pool
  type?: string // optional: further filter within kind ('gpu', 'fpga', 'tpu')
  min: number // MUST have at least this much
  recommended?: number // ideal amount; below this the env is a poorer fit
  unit?: string // display hint: 'cores' | 'GB' | 'count'
  description?: string
}

export interface UserConfigurableEnvVar {
  key: string // env var name, supplied via userData
  validation?: string // optional regex; validated by the node at SERVICE_START time
  sensitive?: boolean // advisory hint for clients/UI (e.g. mask on input)
}

// ── Public / sanitized template ───────────────────────────────────────
// Returned by SERVICE_GET_TEMPLATES. `envVars` values are stripped (keys only).
// Choosing a matching compute environment is the client's responsibility — see
// getComputeEnvironments() and the per-env `features.services` flag.
export interface ServiceTemplatePublic {
  id: string // [a-z0-9][a-z0-9_-]{0,63}
  name?: string
  description?: string
  image: string // base image name
  tag?: string // mutually exclusive with checksum/dockerfile
  checksum?: string // digest: "sha256:<64 hex>"
  dockerfile?: string // inline Dockerfile content
  additionalDockerFiles?: Record<string, string> // filename → content; only with dockerfile
  exposedPorts: number[]
  envVarKeys?: string[] // keys of the operator-set env vars only, never values
  userConfigurableEnvVars?: UserConfigurableEnvVar[]
  command?: string[] // Docker CMD override; ${KEY} expanded from userData
  entrypoint?: string[] // Docker ENTRYPOINT override
  requiredResources?: TemplateResourceRequirement[]
  recommendedResources?: TemplateResourceRequirement[]
}

// ── Runtime service job ────────────────────────────────────────────────

// Port mapping for a running service (named ServiceJobEndpoint to avoid colliding
// with the provider-route `ServiceEndpoint` type used for node endpoint discovery).
export interface ServiceJobEndpoint {
  containerPort: number
  hostPort: number
  url: string // e.g. "http://<nodeHost>:31042"
}

/* eslint-disable no-unused-vars */
export enum ServiceStatusNumber {
  Starting = 10, // DB record created by the start handler; awaits background processing
  PullImage = 11, // pulling pre-built image from registry
  PullImageFailed = 12,
  BuildImage = 13, // building from Dockerfile
  BuildImageFailed = 14,
  VulnerableImage = 15, // image scan found critical vulnerabilities
  Locking = 20, // escrow createLock in progress (funds locked, not yet claimed)
  Claiming = 30, // payment phase: claimLock on success, or cancelLock if the image step failed
  Running = 40,
  Stopping = 50,
  Stopped = 70,
  Expired = 75,
  Error = 99
}
/* eslint-enable no-unused-vars */

// Payment record attached to a service job (start payment + each extend).
export interface ServiceJobPayment {
  chainId?: number
  token?: string
  lockTx?: string
  claimTx?: string
  cost?: string | number
  [key: string]: any
}

// As returned by the node (userData is always stripped from responses).
export interface ServiceJob {
  serviceId: string // unique id for a running service — distinct from a compute jobId
  clusterHash: string
  environment: string // envId the service runs on
  owner: string // consumerAddress
  image: string
  tag?: string
  checksum?: string
  dockerfile?: string
  additionalDockerFiles?: Record<string, string>
  dockerCmd?: string[]
  dockerEntrypoint?: string[]
  containerImage: string // resolved final reference used by Docker
  containerId: string
  networkId: string // per-service Docker network id
  status: ServiceStatusNumber
  statusText: string
  dateCreated: string // ISO timestamp
  expiresAt: number // Unix ms timestamp
  duration: number // requested seconds
  exposedPorts: number[]
  endpoints: ServiceJobEndpoint[]
  resources: any[] // ComputeResourceRequestWithPrice[] on the node
  payment: ServiceJobPayment // initial start payment
  extendPayments?: ServiceJobPayment[] // one entry per successful SERVICE_EXTEND
}

// ── Request shapes ─────────────────────────────────────────────────────

export interface ServicePayment {
  chainId: number
  token: string
}

// `userData` may be a plain object (the client encrypts it with ECIES to the
// node's public key) or an already ECIES-encrypted hex string (passed through).
export type ServiceUserData = Record<string, unknown> | string

export interface ServiceStartParams {
  environment: string // required: the envId to run the service on
  image: string // base image name (or build label when dockerfile is set)
  tag?: string // pull by name:tag
  checksum?: string // pull by digest: "sha256:<64 hex>"
  dockerfile?: string // build from inline Dockerfile; requires allowImageBuild on the env
  additionalDockerFiles?: Record<string, string>
  dockerCmd?: string[] // exec-form CMD override (no shell)
  dockerEntrypoint?: string[]
  exposedPorts?: number[]
  resources?: ComputeResourceRequest[]
  duration: number // seconds; capped by serviceOnDemand.maxDurationSeconds
  userData?: ServiceUserData
  payment: ServicePayment
}
