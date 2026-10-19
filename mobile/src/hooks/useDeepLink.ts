import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import { useAuthStore } from '../stores/authStore';
import {
  resolveDeepLink,
  requiresAuth,
  type DeepLinkTarget,
} from '../constants/links';

export type { DeepLinkTarget };

/**
 * Deep-link routing with auth-aware guards (issue #261).
 *
 * - A link that lands while authenticated navigates immediately.
 * - A link that needs auth while signed out is parked; `resumePendingDeepLink`
 *   replays it once a token appears (login-then-continue).
 * - Web-only links (driver SMS links, issue #451) open in the browser, where
 *   the web app handles them without a login.
 * - Unrecognised / malformed links are dropped (resolveDeepLink returns null).
 *
 * The pending target lives in a module-level slot so it survives the
 * WalletConnect -> TradeList remount that happens on login.
 */

let pendingTarget: DeepLinkTarget | null = null;
const listeners = new Set<() => void>();

function setPending(target: DeepLinkTarget | null): void {
  pendingTarget = target;
  listeners.forEach((l) => l());
}

interface UseDeepLinkReturn {
  pendingDeepLink: DeepLinkTarget | null;
  /** Parse a raw URL (cold-start or runtime) and route or park it. */
  handleUrl: (url: string | null | undefined, navigation?: NavigationContainerRef<RootStackParamList> | null) => void;
  /** Park an already-parsed target (kept for backwards compat + tests). */
  handleDeepLink: (target: DeepLinkTarget) => void;
  /** Replay a parked link once the user is authenticated. */
  resumePendingDeepLink: (navigation: NavigationContainerRef<RootStackParamList> | null) => void;
}

function navigate(
  navigation: NavigationContainerRef<RootStackParamList> | null | undefined,
  target: DeepLinkTarget,
): void {
  if (!navigation) return;
  navigation.navigate(target.screen as never, (target.params ?? undefined) as never);
}

export function useDeepLink(): UseDeepLinkReturn {
  const { token } = useAuthStore();
  const [pendingDeepLink, setPendingState] = useState<DeepLinkTarget | null>(pendingTarget);

  useEffect(() => {
    const sync = () => setPendingState(pendingTarget);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const routeOrPark = useCallback(
    (target: DeepLinkTarget, navigation?: NavigationContainerRef<RootStackParamList> | null) => {
      if (requiresAuth(target) && !token) {
        setPending(target);
        return;
      }
      setPending(null);
      navigate(navigation, target);
    },
    [token],
  );

  const handleUrl = useCallback(
    (url: string | null | undefined, navigation?: NavigationContainerRef<RootStackParamList> | null) => {
      const action = resolveDeepLink(url);
      if (!action) return; // malformed / unknown → ignore
      if (action.kind === 'web') {
        Linking.openURL(action.url).catch(() => undefined);
        return;
      }
      routeOrPark(action.target, navigation);
    },
    [routeOrPark],
  );

  const handleDeepLink = useCallback(
    (target: DeepLinkTarget) => {
      routeOrPark(target);
    },
    [routeOrPark],
  );

  const resumePendingDeepLink = useCallback(
    (navigation: NavigationContainerRef<RootStackParamList> | null) => {
      if (pendingTarget && token) {
        const target = pendingTarget;
        setPending(null);
        navigate(navigation, target);
      }
    },
    [token],
  );

  return { pendingDeepLink, handleUrl, handleDeepLink, resumePendingDeepLink };
}

/** Test helper. */
export function __clearPendingDeepLink(): void {
  setPending(null);
}
