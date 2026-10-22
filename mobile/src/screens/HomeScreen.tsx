import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n';

export interface TradeItem {
  id: string;
  product: string;
  amount: string;
  status: 'active' | 'completed';
}

interface HomeScreenProps {
  onCreateTrade?: () => void;
  onViewTrades?: () => void;
  onViewMarketplace?: () => void;
  onOpenSettings?: () => void;
  onTradePress?: (tradeId: string) => void;
  recentTrades?: TradeItem[];
}

export function HomeScreen({
  onCreateTrade,
  onViewTrades,
  onViewMarketplace,
  onOpenSettings,
  onTradePress,
  recentTrades = [],
}: HomeScreenProps) {
  const { t } = useTranslation();

  const renderTradeItem = ({ item }: { item: TradeItem }) => (
    <TouchableOpacity
      style={styles.tradeItem}
      onPress={() => onTradePress?.(item.id)}
      testID={`trade-item-${item.id}`}
    >
      <View style={styles.tradeInfo}>
        <Text style={styles.tradeProduct}>{item.product}</Text>
        <Text style={styles.tradeAmount}>{item.amount}</Text>
      </View>
      <View
        style={[
          styles.tradeStatus,
          item.status === 'active' ? styles.statusActive : styles.statusCompleted,
        ]}
      >
        <Text style={styles.tradeStatusText}>
          {item.status === 'active' ? t('home.activeTrades') : t('home.completedTrades')}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} testID="home-screen">
      <View style={styles.header}>
        <Text style={styles.welcome}>{t('home.welcome')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onCreateTrade}
          testID="create-trade-button"
        >
          <Text style={styles.primaryButtonText}>{t('home.createTrade')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onViewTrades}
          testID="my-trades-button"
        >
          <Text style={styles.secondaryButtonText}>{t('home.myTrades')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onViewMarketplace}
          testID="marketplace-button"
        >
          <Text style={styles.secondaryButtonText}>{t('home.marketplace')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onOpenSettings}
          testID="settings-button"
        >
          <Text style={styles.secondaryButtonText}>{t('home.settings')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tradesSection}>
        <View style={styles.tradesSectionHeader}>
          <Text style={styles.sectionTitle}>{t('home.recentTrades')}</Text>
          <TouchableOpacity onPress={onViewTrades} testID="view-all-button">
            <Text style={styles.viewAllText}>{t('home.viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {recentTrades.length > 0 ? (
          <FlatList
            data={recentTrades}
            renderItem={renderTradeItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            testID="trades-list"
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('home.noTrades')}</Text>
          </View>
        )}
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
  },
  welcome: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#d1fae5',
    lineHeight: 24,
  },
  actions: {
    padding: 16,
  },
  primaryButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  tradesSection: {
    padding: 16,
    flex: 1,
  },
  tradesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  tradeItem: {
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
  tradeInfo: {
    flex: 1,
  },
  tradeProduct: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  tradeAmount: {
    fontSize: 14,
    color: '#6b7280',
  },
  tradeStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusActive: {
    backgroundColor: '#dbeafe',
  },
  statusCompleted: {
    backgroundColor: '#d1fae5',
  },
  tradeStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default HomeScreen;