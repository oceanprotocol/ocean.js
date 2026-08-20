export interface PolicyServerPassthroughCommand {
  policyServerPassthrough?: any
}

export interface PolicyServerInitializeCommand {
  documentId?: string
  serviceId?: string
  policyServer?: any
  // caller identity, verified by the node before anything is forwarded to the policy
  // server. filled in from the signer / auth token, so any value set here is overwritten
  consumerAddress?: string
  nonce?: string
  signature?: string
}
