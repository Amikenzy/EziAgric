import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n';

export type TradeStatus = 
  | 'pending' 
  | 'funded' 
  | 'dispatched' 
  | 'delivered' 
  | 'completed' 
  | 'disputed' 
  | 'resolved' 
  | 'cancelled';

export interface TradeDetail {
  id: string;
  product: string;
  amount: string;
  status: TradeStatus;
  seller: string;
  buyer: string;
  driver?: string;
  vehicle?: string;
  lossRatio: string;
  createdAt: string;
  updatedAt: string;
}

interface TradeDetailScreenProps {
  tradeId: string;
  fetchTrade?: (id: string) => Promise<TradeDetail>;
  onConfirmDelivery?: (tradeId: string) => Promise<{ success: boolean; error?: string }>;
  onRaiseDispute?: (tradeId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  onViewEvidence?: (tradeId: string) => void;
}

const STATUS_KEYS: Record<TradeStatus, string> = {
  pending: 'trade.detail.statuses.pending',
  funded: 'trade.detail.statuses.funded',
  dispatched: 'trade.detail.statuses.dispatched',
  delivered: 'trade.detail.statuses.delivered',
  completed: 'trade.detail.statuses.completed',
  disputed: 'trade.detail.statuses.disputed',
  resolved: 'trade.detail.statuses.resolved',
  cancelled: 'trade.detail.statuses.cancelled',
};

export function TradeDetailScreen({
  tradeId,
  fetchTrade,
  onConfirmDelivery,
  onRaiseDispute,
  onViewEvidence,
}: TradeDetailScreenProps) {
  const { t } = useTranslation();
  const [trade, setTrade] = useState<TradeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadTrade = useCallback(async () => {
    if (!fetchTrade) {
      setError('No fetch function provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTrade(tradeId);
      setTrade(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('trade.detail.error'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchTrade, tradeId, t]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  const handleConfirmDelivery = useCallback(async () => {
    Alert.alert(
      t('trade.detail.confirmDeliveryTitle'),
      t('trade.detail.confirmDeliveryMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            if (!onConfirmDelivery) return;
            setIsActionLoading(true);
            try {
              const result = await onConfirmDelivery(tradeId);
              if (result.success) {
                Alert.alert(t('common.success'), t('trade.create.success'));
                loadTrade();
              } else {
                Alert.alert(t('common.error'), result.error || t('trade.create.error'));
              }
            } catch (err) {
              Alert.alert(
                t('common.error'),
                err instanceof Error ? err.message : t('trade.create.error')
              );
            } finally {
              setIsActionLoading(false);
            }
          },
        },
      ]
    );
  }, [onConfirmDelivery, tradeId, t, loadTrade]);

  const handleRaiseDispute = useCallback(() => {
    Alert.prompt(
      t('trade.detail.disputeTitle'),
      t('trade.detail.disputeReason'),
      async (reason?: string) => {
        if (!reason || !onRaiseDispute) return;
        
        setIsActionLoading(true);
        try {
          const result = await onRaiseDispute(tradeId, reason);
          if (result.success) {
            Alert.alert(t('common.success'), 'Dispute raised successfully');
            loadTrade();
          } else {
            Alert.alert(t('common.error'), result.error || 'Failed to raise dispute');
          }
        } catch (err) {
          Alert.alert(
            t('common.error'),
            err instanceof Error ? err.message : 'Failed to raise dispute'
          );
        } finally {
          setIsActionLoading(false);
        }
      },
      'plain-text',
      '',
      'default'
    );
  }, [onRaiseDispute, tradeId, t, loadTrade]);

  const handleViewEvidence = useCallback(() => {
    if (onViewEvidence) {
      onViewEvidence(tradeId);
    }
  }, [onViewEvidence, tradeId]);

  const getStatusColor = (status: TradeStatus) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'funded':
        return '#3b82f6';
      case 'dispatched':
        return '#8b5cf6';
      case 'delivered':
        return '#06b6d4';
      case 'completed':
        return '#22c55e';
      case 'disputed':
        return '#ef4444';
      case 'resolved':
        return '#22c55e';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container} testID="trade-detail-loading">
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container} testID="trade-detail-error">
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTrade} testID="retry-button">
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trade) {
    return null;
  }

  return (
    <ScrollView style={styles.container} testID="trade-detail-loaded">
      <View style={styles.header}>
        <Text style={styles.title}>{t('trade.detail.title')}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trade.status) }]}>
          <Text style={styles.statusBadgeText}>{t(STATUS_KEYS[trade.status])}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {/* Trade ID */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.tradeId')}</Text>
          <Text style={styles.value}>{trade.id}</Text>
        </View>

        {/* Product */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.product')}</Text>
          <Text style={styles.value}>{trade.product}</Text>
        </View>

        {/* Amount */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.amount')}</Text>
          <Text style={styles.value}>{trade.amount}</Text>
        </View>

        {/* Status */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.status')}</Text>
          <Text style={[styles.value, { color: getStatusColor(trade.status) }]}>
            {t(STATUS_KEYS[trade.status])}
          </Text>
        </View>

        {/* Seller */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.seller')}</Text>
          <Text style={styles.value}>{trade.seller}</Text>
        </View>

        {/* Buyer */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.buyer')}</Text>
          <Text style={styles.value}>{trade.buyer}</Text>
        </View>

        {/* Driver (if available) */}
        {trade.driver && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('trade.detail.driver')}</Text>
            <Text style={styles.value}>{trade.driver}</Text>
          </View>
        )}

        {/* Vehicle (if available) */}
        {trade.vehicle && (
          <View style={styles.row}>
            <Text style={styles.label}>{t('trade.detail.vehicle')}</Text>
            <Text style={styles.value}>{trade.vehicle}</Text>
          </View>
        )}

        {/* Loss Ratio */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.lossRatio')}</Text>
          <Text style={styles.value}>{trade.lossRatio}</Text>
        </View>

        {/* Created At */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.createdAt')}</Text>
          <Text style={styles.value}>{trade.createdAt}</Text>
        </View>

        {/* Updated At */}
        <View style={styles.row}>
          <Text style={styles.label}>{t('trade.detail.updatedAt')}</Text>
          <Text style={styles.value}>{trade.updatedAt}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {(trade.status === 'delivered' || trade.status === 'dispatched') && (
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleConfirmDelivery}
              disabled={isActionLoading}
              testID="confirm-delivery-button"
            >
              {isActionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryActionText}>{t('trade.detail.actions.confirmDelivery')}</Text>
              )}
            </TouchableOpacity>
          )}

          {(trade.status !== 'completed' && trade.status !== 'cancelled' && trade.status !== 'disputed') && (
            <TouchableOpacity
              style={styles.dangerAction}
              onPress={handleRaiseDispute}
              disabled={isActionLoading}
              testID="raise-dispute-button"
            >
              <Text style={styles.dangerActionText}>{t('trade.detail.actions.raiseDispute')}</Text>
            </TouchableOpacity>
          )}

          {trade.status === 'disputed' && (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleViewEvidence}
              testID="view-evidence-button"
            >
              <Text style={styles.secondaryActionText}>{t('trade.detail.actions.viewEvidence')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#059669',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  row: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerAction: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dangerActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryActionText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TradeDetailScreen;