export const LEGAL_VERSION = "2026-10-draft";

const CONSENT_STORAGE_KEY = "amana-legal-consent";

export interface LegalConsent {
  version: string;
  acceptedAt: string;
}

export function readLegalConsent(): LegalConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const consent = JSON.parse(raw) as LegalConsent;
    return consent.version === LEGAL_VERSION ? consent : null;
  } catch {
    return null;
  }
}

export function saveLegalConsent(): void {
  const consent: LegalConsent = {
    version: LEGAL_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
}
