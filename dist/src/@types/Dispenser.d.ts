export interface DispenserCreationParams {
    dispenserAddress: string;
    maxTokens: string;
    maxBalance: string;
    withMint?: boolean;
    allowedSwapper?: string;
}
