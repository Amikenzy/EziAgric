/**
 * Global type declarations for browser APIs.
 */

/** Minimal Freighter API interface injected into window. */
interface FreighterApi {
  getPublicKey(): Promise<string | { publicKey: string }>;
  signTransaction(
    xdr: string,
    opts?: { networkPassphrase?: string }
  ): Promise<string | { signedTxXdr: string }>;
}

interface Window {
  /** Freighter wallet API injected by the browser extension. */
  freighterApi?: FreighterApi;
}
