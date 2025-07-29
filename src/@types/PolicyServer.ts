export interface PolicyServerPassthroughCommand {
  policyServerPassthrough?: any
}

export interface PolicyServerInitializeCommand {
  documentId?: string
  serviceId?: string
  consumerAddress?: string
  policyServer?: any
}
