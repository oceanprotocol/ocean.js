export interface JwtPayload {
  address: string
  nonce: string
  createdAt: number
  // Present on every token (added by the node when minting). Optional here for backward compat
  // with tokens/decoders that predate them.
  signature?: string
  issuerPeerId?: string
  chainId?: string | null
  // v2 scoped-auth-token claims (companion node plan §4). Present only on v2 tokens:
  //  - `v === 2` marks the scoped format.
  //  - `validUntil` is the signed absolute expiry (epoch ms), always present when `v === 2`.
  //  - `audience` / `scope` are present only when the consumer set a non-empty list (omitted ⇒
  //    unrestricted on that axis).
  v?: number
  validUntil?: number
  audience?: string[]
  scope?: string[]
  // standard JWT issued-at (seconds), added by the signer
  iat?: number
}
