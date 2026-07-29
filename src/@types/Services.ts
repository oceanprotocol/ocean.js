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
  updatedAt?: number // Unix ms; bumped on every status change (SERVICE_LIST updatedSince cursor)
  expiresAt: number // Unix ms timestamp
  duration: number // requested seconds
  exposedPorts: number[]
  endpoints: ServiceJobEndpoint[]
  resources: any[] // ComputeResourceRequestWithPrice[] on the node
  payment: ServiceJobPayment // initial start payment
  extendPayments?: ServiceJobPayment[] // one entry per successful SERVICE_EXTEND
}

// Returned by SERVICE_LIST, which is authenticated but NOT owner-scoped (any consumer
// identity sees every owner's services). On top of the always-stripped userData, the
// node removes everything that reveals HOW a service is configured — CMD/ENTRYPOINT
// overrides and any inline Dockerfile. Identity, status, resources, endpoints and
// payment metadata are kept; use the owner-scoped SERVICE_GET_STATUS for the full view.
export type ServiceJobListed = Omit<
  ServiceJob,
  'dockerCmd' | 'dockerEntrypoint' | 'dockerfile' | 'additionalDockerFiles'
>

// Filters for SERVICE_LIST (getServices). With no filters the node returns only the
// services currently holding a resource reservation — exactly what the engines count
// against the shared pools: Running/Restarting/Stopping, the mid-start pipeline states,
// paid Error (container died, restartable), and explicitly Stopped within the paid
// window. Expired and never-paid jobs hold nothing and are not listed by default.
export interface ServiceListFilters {
  // filter to ONE specific status (any ServiceStatusNumber, incl. Expired); takes
  // precedence over includeAllStatuses
  status?: ServiceStatusNumber
  // return services in EVERY status instead of only the resource-holding set
  includeAllStatuses?: boolean
  // only services created at/after this moment: ISO date string, or a Unix timestamp
  // (seconds or milliseconds) as a string
  fromTimestamp?: string
  // only services updated (created OR any status change) at/after this moment, same
  // formats as fromTimestamp; returns every status. The incremental-sync cursor.
  updatedSince?: string
}

// ── Request shapes ─────────────────────────────────────────────────────

export interface ServicePayment {
  chainId: number
  token: string
}

// A plain key→value map of container env vars. The client always ECIES-encrypts it
// to the node's public key before sending — callers never pass pre-encrypted data,
// so a plaintext secret can never be forwarded unencrypted.
export type ServiceUserData = Record<string, unknown>

// The container specification shared by serviceStart and serviceRestart. Every field is
// optional here; the consuming type decides which are required (serviceStart re-declares
// `image` as mandatory). `userData` is always ECIES-encrypted to the node before sending.
export interface ServiceContainerSpec {
  image?: string // base image name (or build label when dockerfile is set)
  tag?: string // pull by name:tag
  checksum?: string // pull by digest: "sha256:<64 hex>"
  dockerfile?: string // build from inline Dockerfile; requires allowImageBuild on the env
  additionalDockerFiles?: Record<string, string>
  userData?: ServiceUserData
  dockerCmd?: string[] // exec-form CMD override (no shell)
  dockerEntrypoint?: string[]
}

// Optional container-spec overrides for serviceRestart. The node treats the restart
// atomically ("all-or-nothing"): providing ANY of image/tag/checksum/dockerfile/
// additionalDockerFiles switches it into RESPEC mode — the container is rebuilt entirely
// from these values (`image` becomes mandatory, and exactly one of tag/checksum/dockerfile
// applies) instead of being bounced on the stored spec (REUSE mode). Passing none of them
// reuses the stored container spec unchanged. `userData`/`dockerCmd`/`dockerEntrypoint`
// keep their replace-when-supplied semantics: an omitted value reuses the stored one, an
// explicit value (including `[]`) REPLACES it.
export type ServiceRestartParams = ServiceContainerSpec

export interface ServiceStartParams extends ServiceContainerSpec {
  environment: string // required: the envId to run the service on
  image: string // required for start (base image name, or build label when dockerfile is set)
  exposedPorts?: number[]
  resources?: ComputeResourceRequest[]
  duration: number // seconds; capped by serviceOnDemand.maxDurationSeconds
  payment: ServicePayment
}
