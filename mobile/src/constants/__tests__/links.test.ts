import {
  parseDeepLink,
  resolveDeepLink,
  webUrlFor,
  requiresAuth,
  LINKING_SCREEN_CONFIG,
} from '../links';

describe('SMS links (issue #451)', () => {
  it('opens trade sub-pages such as the dispute page on the trade', () => {
    expect(parseDeepLink('https://amanavault.app/trades/T-123/dispute')).toEqual({
      screen: 'TradeDetail',
      params: { tradeId: 'T-123' },
    });
    expect(parseDeepLink('https://www.amanavault.app/trades/T-123/timeline/')).toEqual({
      screen: 'TradeDetail',
      params: { tradeId: 'T-123' },
    });
  });

  it('still prefers the evidence screen over the generic trade alias', () => {
    expect(parseDeepLink('https://amanavault.app/trades/T1/evidence')).toEqual({
      screen: 'EvidenceCapture',
      params: { tradeId: 'T1' },
    });
  });

  it('maps the web create-trade page to CreateTrade, not a trade called "create"', () => {
    expect(parseDeepLink('https://amanavault.app/trades/create')).toEqual({ screen: 'CreateTrade' });
    expect(webUrlFor({ screen: 'CreateTrade' })).toBe('https://amanavault.app/trades/create');
  });

  it('routes the driver home link into the app', () => {
    expect(parseDeepLink('amanavault://driver')).toEqual({ screen: 'DriverHome' });
    expect(requiresAuth({ screen: 'DriverHome' })).toBe(true);
  });

  it('sends driver token links to the web attestation page', () => {
    expect(resolveDeepLink('https://amanavault.app/driver/abc123')).toEqual({
      kind: 'web',
      url: 'https://amanavault.app/driver/abc123',
    });
    expect(resolveDeepLink('amanavault://driver/abc123/')).toEqual({
      kind: 'web',
      url: 'https://amanavault.app/driver/abc123',
    });
    expect(resolveDeepLink('/driver/abc123')).toEqual({
      kind: 'web',
      url: 'https://amanavault.app/driver/abc123',
    });
  });

  it('never sends links on other hosts to the web fallback', () => {
    expect(resolveDeepLink('https://evil.example/driver/abc123')).toBeNull();
  });

  it('wraps in-app targets as app actions and ignores unknown links', () => {
    expect(resolveDeepLink('https://amanavault.app/trades/T9')).toEqual({
      kind: 'app',
      target: { screen: 'TradeDetail', params: { tradeId: 'T9' } },
    });
    expect(resolveDeepLink('https://amanavault.app/nope/here')).toBeNull();
    expect(resolveDeepLink(null)).toBeNull();
  });

  it('keeps one canonical linking path per screen', () => {
    expect(LINKING_SCREEN_CONFIG.TradeDetail).toBe('trades/:tradeId');
    expect(LINKING_SCREEN_CONFIG.CreateTrade).toBe('create-trade');
    expect(LINKING_SCREEN_CONFIG.DriverHome).toBe('driver');
  });
});

describe('parseDeepLink', () => {
  it('parses a universal link to a trade', () => {
    expect(parseDeepLink('https://amanavault.app/trades/T-123')).toEqual({
      screen: 'TradeDetail',
      params: { tradeId: 'T-123' },
    });
  });

  it('parses a custom-scheme link to a trade (cold start payload)', () => {
    expect(parseDeepLink('amanavault://trades/T-123')).toEqual({
      screen: 'TradeDetail',
      params: { tradeId: 'T-123' },
    });
  });

  it('parses a bare path (warm start / notification data)', () => {
    expect(parseDeepLink('/disputes/D9')).toEqual({
      screen: 'DisputeDetail',
      params: { id: 'D9' },
    });
  });

  it('parses the trade list with no params', () => {
    expect(parseDeepLink('https://amanavault.app/trades')).toEqual({ screen: 'TradeList' });
  });

  it('parses an evidence-capture universal link', () => {
    expect(parseDeepLink('https://amanavault.app/trades/T1/evidence')).toEqual({
      screen: 'EvidenceCapture',
      params: { tradeId: 'T1' },
    });
  });

  it('returns null for malformed / unknown links', () => {
    expect(parseDeepLink('https://amanavault.app/nope/here')).toBeNull();
    expect(parseDeepLink('not a url')).toBeNull();
    expect(parseDeepLink('')).toBeNull();
    expect(parseDeepLink(null)).toBeNull();
  });

  it('treats a trailing-slash trades path as the list', () => {
    expect(parseDeepLink('amanavault://trades/')).toEqual({ screen: 'TradeList' });
  });

  it('round-trips to a public web URL', () => {
    const target = parseDeepLink('amanavault://trades/T-123')!;
    expect(webUrlFor(target)).toBe('https://amanavault.app/trades/T-123');
  });

  it('flags auth requirement per screen', () => {
    expect(requiresAuth({ screen: 'TradeDetail' })).toBe(true);
    expect(requiresAuth({ screen: 'WalletConnect' })).toBe(false);
  });
});
