import { useEffect, useMemo, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import type { LinkingOptions, NavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';

import type { RootStackParamList } from '../types/navigation';
import WalletConnectScreen from '../screens/WalletConnectScreen';
import TradeListScreen from '../screens/TradeListScreen';
import TradeDetailScreen from '../screens/TradeDetailScreen';
import DisputeDetailScreen from '../screens/DisputeDetailScreen';
import CreateTradeScreen from '../screens/CreateTradeScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import ListingDetailScreen from '../screens/ListingDetailScreen';
import CreateListingScreen from '../screens/CreateListingScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import DriverAttestationScreen from '../screens/DriverAttestationScreen';
import EvidenceCaptureScreen from '../screens/EvidenceCaptureScreen';
import VaultDashboard from '../screens/VaultDashboard';
import AdminStreamsOverviewScreen from '../screens/AdminStreamsOverviewScreen';
import AdminTradesBatchScreen from '../screens/AdminTradesBatchScreen';
import AdminContractScreen from '../screens/AdminContractScreen';
import AdminFeaturesScreen from '../screens/AdminFeaturesScreen';
import AdminActionSuccessScreen from '../screens/AdminActionSuccessScreen';
import CoopHomeScreen from '../screens/CoopHomeScreen';
import MediatorDisputeListScreen from '../screens/MediatorDisputeListScreen';
import MediatorDisputeReviewScreen from '../screens/MediatorDisputeReviewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TrustScoreScreen from '../screens/TrustScoreScreen';
import LeaveReviewScreen from '../screens/LeaveReviewScreen';
import { useDeepLink } from '../hooks/useDeepLink';
import {
  LINK_PREFIXES,
  LINKING_SCREEN_CONFIG,
  resolveDeepLink,
  requiresAuth,
} from '../constants/links';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Deep linking configuration (issue #261). Path <-> screen mapping is the
 * shared table in constants/links.ts so the web app and hosted
 * apple-app-site-association / assetlinks.json stay consistent.
 *
 * `getStateFromPath` runs our own parser first: an unrecognised link falls
 * through to react-navigation's default (which no-ops to the initial route
 * rather than crashing), and a link that needs auth while signed out resolves
 * to WalletConnect — useDeepLink parks the real target and resumes it on login.
 */
function makeLinking(isAuthenticated: boolean): LinkingOptions<RootStackParamList> {
  return {
    prefixes: LINK_PREFIXES,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: { screens: LINKING_SCREEN_CONFIG as any },
    getStateFromPath: (path, options) => {
      const action = resolveDeepLink(path);
      // Web-only links (driver SMS links) are opened in the browser by
      // useDeepLink; there is no in-app state to build for them.
      if (action?.kind === 'web') return undefined;
      const target = action?.target;
      if (target && requiresAuth(target) && !isAuthenticated) {
        // Land on WalletConnect; useDeepLink parks the real target and
        // resumes it once a token appears (login-then-continue).
        return { routes: [{ name: 'WalletConnect' }] };
      }
      if (target) {
        // Build the state from our parser so alias paths such as
        // /trades/:id/dispute land on the same screen as their canonical path.
        return { routes: [{ name: target.screen, params: target.params }] } as never;
      }
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nav = require('@react-navigation/native');
      return nav.getStateFromPath(path, options);
    },
  };
}

interface AppNavigatorProps {
  isAuthenticated: boolean;
}

export function AppNavigator({ isAuthenticated }: AppNavigatorProps) {
  const { handleUrl, resumePendingDeepLink } = useDeepLink();
  const navRef = useRef<NavigationContainerRef<RootStackParamList> | null>(null);
  const linking = useMemo(() => makeLinking(isAuthenticated), [isAuthenticated]);

  // Cold start: route (or park) the URL the app was opened with.
  useEffect(() => {
    Linking.getInitialURL().then((url) => handleUrl(url, navRef.current));
    // Warm start: route links received while the app is running.
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url, navRef.current));
    return () => sub.remove();
  }, [handleUrl]);

  // Login-then-continue: replay a parked link once authenticated.
  useEffect(() => {
    if (isAuthenticated) {
      resumePendingDeepLink(navRef.current);
    }
  }, [isAuthenticated, resumePendingDeepLink]);

  return (
    <NavigationContainer
      ref={navRef}
      linking={linking}
      fallback={null}
      onReady={() => {
        if (isAuthenticated) {
          resumePendingDeepLink(navRef.current);
        }
      }}
    >
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'TradeList' : 'WalletConnect'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="WalletConnect" component={WalletConnectScreen} />
        <Stack.Screen name="TradeList" component={TradeListScreen} />
        <Stack.Screen name="TradeDetail" component={TradeDetailScreen} />
        <Stack.Screen name="DisputeDetail" component={DisputeDetailScreen} />
        <Stack.Screen name="CreateTrade" component={CreateTradeScreen} />
        <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
        <Stack.Screen name="DriverAttestation" component={DriverAttestationScreen} />
        <Stack.Screen name="EvidenceCapture" component={EvidenceCaptureScreen} />
        <Stack.Screen name="VaultDashboard" component={VaultDashboard} />
        <Stack.Screen name="AdminStreamsOverview" component={AdminStreamsOverviewScreen} />
        <Stack.Screen name="AdminTradesBatch" component={AdminTradesBatchScreen} />
        <Stack.Screen name="AdminContract" component={AdminContractScreen} />
        <Stack.Screen name="AdminFeatures" component={AdminFeaturesScreen} />
        <Stack.Screen name="AdminActionSuccess" component={AdminActionSuccessScreen} />
        <Stack.Screen name="CoopHome" component={CoopHomeScreen} />
        <Stack.Screen name="MediatorDisputeList" component={MediatorDisputeListScreen} />
        <Stack.Screen name="MediatorDisputeReview" component={MediatorDisputeReviewScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="TrustScore" component={TrustScoreScreen} />
        <Stack.Screen name="LeaveReview" component={LeaveReviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
