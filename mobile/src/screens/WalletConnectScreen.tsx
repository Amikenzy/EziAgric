import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n';

export type WalletStatus = 'connected' | 'disconnected' | 'pending' | 'error';

interface WalletConnectScreenProps {
  onConnect?: () => Promise<void>;
  onDisconnect?: () => void;
  initialStatus?: WalletStatus;
}

export const statusLabels: Record<WalletStatus, string> = {
  connected: 'wallet.status.connected',
  disconnected: 'wallet.status.disconnected',
  pending: 'wallet.status.pending',
  error: 'wallet.status.error',
};

export function WalletConnectScreen({
  onConnect,
  onDisconnect,
  initialStatus = 'disconnected',
}: WalletConnectScreenProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<WalletStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = useCallback(async () => {
    if (!onConnect) return;
    setIsLoading(true);
    setStatus('pending');
    try {
      await onConnect();
      setStatus('connected');
    } catch {
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    if (onDisconnect) {
      onDisconnect();
    }
    setStatus('disconnected');
  }, [onDisconnect]);

  useEffect(() => {
    if (initialStatus !== status) {
      setStatus(initialStatus);
    }
  }, [initialStatus, status]);

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return '#22c55e';
      case 'disconnected':
        return '#6b7280';
      case 'pending':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.appName}>{t('wallet.appName')}</Text>
        <Text style={styles.tagline}>{t('wallet.tagline')}</Text>

        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{t(statusLabels[status])}</Text>
        </View>

        <Text style={styles.instructions}>{t('wallet.instructions')}</Text>

        {status === 'disconnected' || status === 'error' ? (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnect}
            disabled={isLoading}
            testID="connect-wallet-button"
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.connectButtonText}>{t('wallet.connect')}</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
            testID="disconnect-wallet-button"
          >
            <Text style={styles.disconnectButtonText}>{t('wallet.disconnect')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  instructions: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  connectButton: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletConnectScreen;