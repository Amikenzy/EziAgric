export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const freighter = window.freighterApi;
  if (!freighter) return false;
  try {
    return await (freighter as { isConnected?: () => Promise<boolean> }).isConnected?.() ?? false;
  } catch {
    return false;
  }
}

export async function signWithFreighter(
  xdr?: string,
  opts?: { network?: string; networkPassphrase?: string },
): Promise<string> {
  const freighter = window.freighterApi;
  if (!freighter) {
    throw new Error('Freighter wallet is not installed');
  }

  if (!xdr) {
    const result = await freighter.getPublicKey();
    return typeof result === 'string' ? result : result.publicKey;
  }

  const result = await freighter.signTransaction(xdr, {
    network: opts?.network,
    networkPassphrase: opts?.networkPassphrase,
  });
  return typeof result === 'string' ? result : result.signedTxXdr;
}
