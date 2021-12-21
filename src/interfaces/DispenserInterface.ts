export interface DispenserCreationParams {
  dispenserAddress: string
  maxTokens: string // how many tokens cand be dispensed when someone requests . If maxTokens=2 then someone can't request 3 in one tx
  maxBalance: string // how many dt the user has in it's wallet before the dispenser will not dispense dt
  withMint?: boolean // true if we want to allow the dispenser to be a minter
  allowedSwapper?: string // only account that can ask tokens. set address(0) if not required
}
