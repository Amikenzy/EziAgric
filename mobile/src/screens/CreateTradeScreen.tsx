import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import '../i18n';

export interface Product {
  id: string;
  name: string;
}

export interface Seller {
  id: string;
  name: string;
  address: string;
}

export interface CreateTradeFormData {
  productId: string;
  amount: string;
  sellerId: string;
  lossRatio: string;
}

interface CreateTradeScreenProps {
  products?: Product[];
  sellers?: Seller[];
  onSubmit?: (data: CreateTradeFormData) => Promise<{ success: boolean; tradeId?: string; error?: string }>;
  onCancel?: () => void;
  onWalletSign?: () => Promise<{ signed: boolean; error?: string }>;
}

const LOSS_RATIO_OPTIONS = ['50/50', '70/30', '80/20', '90/10'];

export function CreateTradeScreen({
  products = [],
  sellers = [],
  onSubmit,
  onCancel,
  onWalletSign,
}: CreateTradeScreenProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<CreateTradeFormData>({
    productId: '',
    amount: '',
    sellerId: '',
    lossRatio: '50/50',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateTradeFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showSellerPicker, setShowSellerPicker] = useState(false);

  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof CreateTradeFormData, string>> = {};

    if (!formData.productId) {
      newErrors.productId = t('trade.create.validation.productRequired');
    }

    if (!formData.amount) {
      newErrors.amount = t('trade.create.validation.amountRequired');
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = t('trade.create.validation.amountPositive');
    }

    if (!formData.sellerId) {
      newErrors.sellerId = t('trade.create.validation.sellerRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // First, sign with wallet if required
      if (onWalletSign) {
        try {
          const signResult = await onWalletSign();
          if (!signResult.signed) {
            Alert.alert(t('common.error'), signResult.error || 'Wallet signing failed');
            setIsSubmitting(false);
            return;
          }
        } catch (signError) {
          Alert.alert(
            t('common.error'),
            signError instanceof Error ? signError.message : 'Wallet signing failed'
          );
          setIsSubmitting(false);
          return;
        }
      }

      // Then submit the trade
      if (onSubmit) {
        const result = await onSubmit(formData);
        if (result.success) {
          Alert.alert(t('common.success'), t('trade.create.success'));
          // Reset form
          setFormData({
            productId: '',
            amount: '',
            sellerId: '',
            lossRatio: '50/50',
          });
        } else {
          Alert.alert(t('common.error'), result.error || t('trade.create.error'));
        }
      }
    } catch (submitError) {
      Alert.alert(
        t('common.error'),
        submitError instanceof Error ? submitError.message : t('trade.create.error')
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onWalletSign, validateForm, t]);

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const selectedSeller = sellers.find((s) => s.id === formData.sellerId);

  return (
    <ScrollView style={styles.container} testID="create-trade-screen">
      <View style={styles.header}>
        <Text style={styles.title}>{t('trade.create.title')}</Text>
      </View>

      <View style={styles.form}>
        {/* Product Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('trade.create.selectProduct')}</Text>
          <TouchableOpacity
            style={[styles.picker, errors.productId && styles.pickerError]}
            onPress={() => setShowProductPicker(!showProductPicker)}
            testID="product-picker"
          >
            <Text style={selectedProduct ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedProduct?.name || t('trade.create.selectProduct')}
            </Text>
          </TouchableOpacity>
          {errors.productId && <Text style={styles.errorText}>{errors.productId}</Text>}
          {showProductPicker && (
            <View style={styles.pickerOptions}>
              {products.map((product) => (
                <TouchableOpacity
                  key={product.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, productId: product.id }));
                    setShowProductPicker(false);
                    setErrors((prev) => ({ ...prev, productId: undefined }));
                  }}
                >
                  <Text style={styles.pickerOptionText}>{product.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('trade.create.enterAmount')}</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={formData.amount}
            onChangeText={(text) => {
              setFormData((prev) => ({ ...prev, amount: text }));
              setErrors((prev) => ({ ...prev, amount: undefined }));
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#9ca3af"
            testID="amount-input"
          />
          {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
        </View>

        {/* Seller Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('trade.create.selectSeller')}</Text>
          <TouchableOpacity
            style={[styles.picker, errors.sellerId && styles.pickerError]}
            onPress={() => setShowSellerPicker(!showSellerPicker)}
            testID="seller-picker"
          >
            <Text style={selectedSeller ? styles.pickerText : styles.pickerPlaceholder}>
              {selectedSeller?.name || t('trade.create.selectSeller')}
            </Text>
          </TouchableOpacity>
          {errors.sellerId && <Text style={styles.errorText}>{errors.sellerId}</Text>}
          {showSellerPicker && (
            <View style={styles.pickerOptions}>
              {sellers.map((seller) => (
                <TouchableOpacity
                  key={seller.id}
                  style={styles.pickerOption}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, sellerId: seller.id }));
                    setShowSellerPicker(false);
                    setErrors((prev) => ({ ...prev, sellerId: undefined }));
                  }}
                >
                  <Text style={styles.pickerOptionText}>{seller.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Loss Ratio Selection */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('trade.create.lossRatio')}</Text>
          <View style={styles.lossRatioContainer}>
            {LOSS_RATIO_OPTIONS.map((ratio) => (
              <TouchableOpacity
                key={ratio}
                style={[
                  styles.lossRatioOption,
                  formData.lossRatio === ratio && styles.lossRatioSelected,
                ]}
                onPress={() => setFormData((prev) => ({ ...prev, lossRatio: ratio }))}
                testID={`loss-ratio-${ratio.replace('/', '-')}`}
              >
                <Text
                  style={[
                    styles.lossRatioText,
                    formData.lossRatio === ratio && styles.lossRatioTextSelected,
                  ]}
                >
                  {ratio}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
            testID="submit-button"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{t('trade.create.submit')}</Text>
            )}
          </TouchableOpacity>

          {onCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              testID="cancel-button"
            >
              <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  picker: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
  },
  pickerError: {
    borderColor: '#ef4444',
  },
  pickerText: {
    fontSize: 16,
    color: '#1f2937',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  lossRatioContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lossRatioOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  lossRatioSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  lossRatioText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  lossRatioTextSelected: {
    color: '#fff',
  },
  actions: {
    marginTop: 24,
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CreateTradeScreen;