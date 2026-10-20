/**
 * Wallet adapter interface for Stellar wallets.
 *
 * Abstracts sign-in and transaction signing so multiple wallet
 * implementations (Freighter, Albedo, ...) can be used interchangeably.
 */

export type WalletId = 'freighter' | 'albedo';

export interface WalletAdapter {
  /** Stable identifier used for persistence and the picker. */
  readonly id: WalletId;
  /** Human readable name shown in the wallet picker. */
  readonly name: string;
  /** Whether the wallet is available in the current environment. */
  isAvailable(): Promise<boolean>;
  /** Request the public key from the wallet. */
  getPublicKey(): Promise<string>;
  /** Sign a base64-encoded XDR transaction envelope. */
  signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string>;
}

const LAST_WALLET_KEY = 'stellar:last-wallet';

/** Persist the last wallet the user selected. */
export function persistLastWallet(id: WalletId): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LAST_WALLET_KEY, id);
    }
  } catch {
    // Ignore storage failures (private mode, disabled storage, ...).
  }
}

/** Read the last wallet the user selected, if any. */
export function getLastWallet(): WalletId | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const value = window.localStorage.getItem(LAST_WALLET_KEY);
      if (value === 'freighter' || value === 'albedo') {
        return value;
      }
    }
  } catch {
    // Ignore storage failures.
  }
  return null;
}

/** Minimal Freighter API interface. */
interface FreighterApi {
  getPublicKey(): Promise<string | { publicKey: string }>;
  signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string | { signedTxXdr: string }>;
}

/** Minimal Albedo API interface. */
interface AlbedoApi {
  publicKey(opts: { token: string }): Promise<{ pubkey: string }>;
  tx(opts: { xdr: string; network?: string; submit: boolean }): Promise<{ signed_envelope_xdr: string }>;
}

/**
 * Freighter adapter.
 *
 * Uses the injected `window.freighterApi` when present and falls back to
 * the `@stellar/freighter-api` module otherwise.
 */
export const freighterAdapter: WalletAdapter = {
  id: 'freighter',
  name: 'Freighter',

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (window.freighterApi) return true;
    try {
      const mod = await import('@stellar/freighter-api');
      return typeof mod !== 'undefined';
    } catch {
      return false;
    }
  },

  async getPublicKey(): Promise<string> {
    const api = await loadFreighter();
    const result = await api.getPublicKey();
    return typeof result === 'string' ? result : result?.publicKey;
  },

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const api = await loadFreighter();
    const result = await api.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase,
    });
    return typeof result === 'string' ? result : result?.signedTxXdr;
  },
};

async function loadFreighter(): Promise<FreighterApi> {
  if (typeof window !== 'undefined' && window.freighterApi) {
    return window.freighterApi;
  }
  const mod = await import('@stellar/freighter-api');
  return mod as unknown as FreighterApi;
}

/**
 * Albedo adapter backed by `@albedo-link/intent`.
 */
export const albedoAdapter: WalletAdapter = {
  id: 'albedo',
  name: 'Albedo',

  async isAvailable(): Promise<boolean> {
    try {
      await loadAlbedo();
      return true;
    } catch {
      return false;
    }
  },

  async getPublicKey(): Promise<string> {
    const albedo = await loadAlbedo();
    const result = await albedo.publicKey({ token: '' });
    return result.pubkey;
  },

  async signTransaction(xdr: string, opts?: { networkPassphrase?: string }): Promise<string> {
    const albedo = await loadAlbedo();
    const result = await albedo.tx({
      xdr,
      network: opts?.networkPassphrase,
      submit: false,
    });
    return result.signed_envelope_xdr;
  },
};

async function loadAlbedo(): Promise<AlbedoApi> {
  const mod = await import('@albedo-link/intent');
  return (mod.default ?? mod) as AlbedoApi;
}

/** All supported wallet adapters, in picker order. */
export const walletAdapters: WalletAdapter[] = [freighterAdapter, albedoAdapter];

/** Look up an adapter by its id. */
export function getWalletAdapter(id: WalletId): WalletAdapter | undefined {
  return walletAdapters.find((adapter) => adapter.id === id);
}
