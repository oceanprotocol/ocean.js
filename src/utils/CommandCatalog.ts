import {
  PROTOCOL_COMMANDS,
  TOKEN_SCOPE_DISALLOWED,
  CommandInfo,
  CommandCategory
} from '../@types/Provider'

/**
 * User-facing catalog of protocol commands, to support auth-token `scope` UX (plan §9.2).
 *
 * This is a STATIC MIRROR of the node's command set (`PROTOCOL_COMMANDS` in ocean-node
 * `src/utils/constants.ts`). There is no shared package — keep the two in sync by hand.
 *
 * `scopable` is derived from {@link TOKEN_SCOPE_DISALLOWED}: a command is scopable unless it is in
 * that disallowed set. The two read-only admin commands (fetchConfig, getLogs) ARE scopable
 * (`adminReadonly: true`). Commands the node refuses a bearer token for (mutating admin,
 * decryptDDO) are marked `tokenAuth: false`.
 */

interface CatalogSeed {
  command: string
  description: string
  category: CommandCategory
  adminReadonly?: boolean
  tokenAuth?: boolean
}

const SEED: CatalogSeed[] = [
  { command: PROTOCOL_COMMANDS.DOWNLOAD, description: 'Download a purchased asset file', category: 'data' },
  { command: PROTOCOL_COMMANDS.ENCRYPT, description: 'Encrypt a payload with the node key', category: 'data' },
  { command: PROTOCOL_COMMANDS.ENCRYPT_FILE, description: 'Encrypt a file stream', category: 'data' },
  // decryptDDO: per-resource ON-02 signature only — never a bearer token
  { command: PROTOCOL_COMMANDS.DECRYPT_DDO, description: 'Decrypt a DDO (signature only)', category: 'data', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.GET_DDO, description: 'Fetch a DDO by DID', category: 'data' },
  { command: PROTOCOL_COMMANDS.QUERY, description: 'Query the metadata index', category: 'data' },
  { command: PROTOCOL_COMMANDS.NONCE, description: 'Get the current nonce for an address', category: 'auth' },
  { command: PROTOCOL_COMMANDS.STATUS, description: 'Node status', category: 'status' },
  { command: PROTOCOL_COMMANDS.DETAILED_STATUS, description: 'Detailed node status', category: 'status' },
  { command: PROTOCOL_COMMANDS.FIND_DDO, description: 'Find a DDO across the network', category: 'data' },
  { command: PROTOCOL_COMMANDS.GET_FEES, description: 'Get provider fees for an order', category: 'data' },
  { command: PROTOCOL_COMMANDS.FILE_INFO, description: 'Inspect a file (size/content-type)', category: 'data' },
  { command: PROTOCOL_COMMANDS.VALIDATE_DDO, description: 'Validate a DDO', category: 'data' },
  { command: PROTOCOL_COMMANDS.COMPUTE_GET_ENVIRONMENTS, description: 'List compute environments', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_START, description: 'Start a paid compute job', category: 'compute' },
  { command: PROTOCOL_COMMANDS.FREE_COMPUTE_START, description: 'Start a free compute job', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_STOP, description: 'Stop a compute job', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_GET_STATUS, description: 'Get compute job status', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_GET_STREAMABLE_LOGS, description: 'Stream compute job logs', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_GET_RESULT, description: 'Get a compute job result', category: 'compute' },
  { command: PROTOCOL_COMMANDS.COMPUTE_INITIALIZE, description: 'Initialize a compute job', category: 'compute' },
  // mutating admin — signature only, token rejected
  { command: PROTOCOL_COMMANDS.STOP_NODE, description: 'Stop the node (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.STOP_JOB, description: 'Stop a job (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.REINDEX_TX, description: 'Reindex a transaction (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.REINDEX_CHAIN, description: 'Reindex a chain (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.HANDLE_INDEXING_THREAD, description: 'Start/stop indexing (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.COLLECT_FEES, description: 'Collect node fees (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.PUSH_CONFIG, description: 'Push node config (admin)', category: 'admin', tokenAuth: false },
  { command: PROTOCOL_COMMANDS.SET_MAINTENANCE, description: 'Toggle maintenance mode (admin)', category: 'admin', tokenAuth: false },
  // read-only admin — token OR signature, scopable
  { command: PROTOCOL_COMMANDS.FETCH_CONFIG, description: 'Fetch node config (read-only admin)', category: 'admin', adminReadonly: true },
  { command: PROTOCOL_COMMANDS.GET_LOGS, description: 'Fetch node logs (read-only admin)', category: 'admin', adminReadonly: true },
  // auth management — token can never mint/revoke/validate tokens
  { command: PROTOCOL_COMMANDS.CREATE_AUTH_TOKEN, description: 'Create an auth token', category: 'auth' },
  { command: PROTOCOL_COMMANDS.INVALIDATE_AUTH_TOKEN, description: 'Invalidate an auth token', category: 'auth' },
  { command: PROTOCOL_COMMANDS.VALIDATE_AUTH_TOKEN, description: 'Validate an auth token (node-to-node)', category: 'auth' },
  { command: PROTOCOL_COMMANDS.POLICY_SERVER_PASSTHROUGH, description: 'Policy server passthrough', category: 'other' },
  { command: PROTOCOL_COMMANDS.POLICY_SERVER_INITIALIZE, description: 'Policy server initialize', category: 'other' },
  { command: PROTOCOL_COMMANDS.GET_P2P_PEER, description: 'Get a P2P peer', category: 'p2p' },
  { command: PROTOCOL_COMMANDS.GET_P2P_PEERS, description: 'List P2P peers', category: 'p2p' },
  { command: PROTOCOL_COMMANDS.GET_P2P_NETWORK_STATS, description: 'P2P network stats', category: 'p2p' },
  { command: PROTOCOL_COMMANDS.GET_NODE_METRICS, description: 'Node resource metrics', category: 'status' },
  { command: PROTOCOL_COMMANDS.GET_NODE_METRICS_HISTORY, description: 'Node resource metrics history', category: 'status' },
  { command: PROTOCOL_COMMANDS.FIND_PEER, description: 'Find a peer', category: 'p2p' },
  { command: PROTOCOL_COMMANDS.JOBS, description: 'List jobs', category: 'compute' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_CREATE_BUCKET, description: 'Create a storage bucket', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPDATE_BUCKET, description: 'Update a storage bucket', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_BUCKETS, description: 'List storage buckets', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_LIST_FILES, description: 'List storage files', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_UPLOAD_FILE, description: 'Upload a storage file', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_GET_FILE_OBJECT, description: 'Get a storage file object', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DELETE_FILE, description: 'Delete a storage file', category: 'storage' },
  { command: PROTOCOL_COMMANDS.PERSISTENT_STORAGE_DOWNLOAD_FILE, description: 'Download a storage file', category: 'storage' },
  { command: PROTOCOL_COMMANDS.SERVICE_GET_TEMPLATES, description: 'List service templates', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_START, description: 'Start a service', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_STOP, description: 'Stop a service', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_RESTART, description: 'Restart a service', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_GET_STATUS, description: 'Get service status', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_LIST, description: 'List running services', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_EXTEND, description: 'Extend a service', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_GET_STREAMABLE_LOGS, description: 'Stream service logs', category: 'service' },
  { command: PROTOCOL_COMMANDS.SERVICE_GET_RESULT, description: 'Get a service result', category: 'service' },
  { command: PROTOCOL_COMMANDS.GET_ESCROW_EVENTS, description: 'Query escrow events', category: 'other' }
]

function toCommandInfo(seed: CatalogSeed): CommandInfo {
  const scopable = !TOKEN_SCOPE_DISALLOWED.includes(seed.command)
  return {
    command: seed.command,
    description: seed.description,
    category: seed.category,
    scopable,
    ...(seed.adminReadonly ? { adminReadonly: true } : {}),
    // tokenAuth defaults to true unless the seed marks it false
    tokenAuth: seed.tokenAuth !== false
  }
}

/** The command catalog keyed by command value. */
export const COMMANDS: Record<string, CommandInfo> = Object.fromEntries(
  SEED.map((s) => [s.command, toCommandInfo(s)])
)

/** The subset of commands that may appear in an auth-token scope. */
export function listScopableCommands(): CommandInfo[] {
  return Object.values(COMMANDS).filter((c) => c.scopable)
}
