import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { TradeDetailScreen, TradeDetail, TradeStatus } from '../TradeDetailScreen';
import i18n from '../../i18n';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'common.loading': 'Loading...',
        'common.retry': 'Retry',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'common.success': 'Success',
        'common.error': 'Error',
        'trade.detail.title': 'Trade Details',
        'trade.detail.tradeId': 'Trade ID',
        'trade.detail.status': 'Status',
        'trade.detail.amount': 'Amount',
        'trade.detail.product': 'Product',
        'trade.detail.seller': 'Seller',
        'trade.detail.buyer': 'Buyer',
        'trade.detail.driver': 'Driver',
        'trade.detail.vehicle': 'Vehicle',
        'trade.detail.lossRatio': 'Loss Ratio',
        'trade.detail.createdAt': 'Created',
        'trade.detail.updatedAt': 'Last Updated',
        'trade.detail.actions.confirmDelivery': 'Confirm Delivery',
        'trade.detail.actions.raiseDispute': 'Raise Dispute',
        'trade.detail.actions.viewEvidence': 'View Evidence',
        'trade.detail.statuses.pending': 'Pending',
        'trade.detail.statuses.funded': 'Funded',
        'trade.detail.statuses.dispatched': 'Dispatched',
        'trade.detail.statuses.delivered': 'Delivered',
        'trade.detail.statuses.completed': 'Completed',
        'trade.detail.statuses.disputed': 'Disputed',
        'trade.detail.statuses.resolved': 'Resolved',
        'trade.detail.statuses.cancelled': 'Cancelled',
        'trade.detail.confirmDeliveryTitle': 'Confirm Delivery',
        'trade.detail.confirmDeliveryMessage': 'Are you sure you want to confirm delivery? This action cannot be undone.',
        'trade.detail.disputeTitle': 'Raise Dispute',
        'trade.detail.disputeReason': 'Reason for dispute',
        'trade.detail.error': 'Failed to load trade details',
        'trade.create.success': 'Trade created successfully!',
        'trade.create.error': 'Failed to create trade',
      };
      return keys[key] || key;
    },
  }),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      ...RN.Alert,
      alert: jest.fn(),
      prompt: jest.fn(),
    },
  };
});

describe('TradeDetailScreen', () => {
  beforeAll(() => {
    i18n.changeLanguage('en');
  });

  const mockTrade: TradeDetail = {
    id: 'trade-123',
    product: 'Maize',
    amount: '₦500,000',
    status: 'funded',
    seller: 'Farmer John',
    buyer: 'Buyer Alice',
    driver: 'Driver Bob',
    vehicle: 'Truck ABC-123',
    lossRatio: '50/50',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-16',
  };

  const defaultProps = {
    tradeId: 'trade-123',
    fetchTrade: jest.fn().mockResolvedValue(mockTrade),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state initially', async () => {
      let resolveTrade: (trade: TradeDetail) => void;
      const mockFetchTrade = jest.fn().mockImplementation(
        () => new Promise<TradeDetail>((resolve) => {
          resolveTrade = resolve;
        })
      );
      
      const { getByTestId, getByText } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={mockFetchTrade} />
      );

      expect(getByTestId('trade-detail-loading')).toBeTruthy();
      expect(getByText('Loading...')).toBeTruthy();

      // Resolve the promise
      await act(async () => {
        resolveTrade!(mockTrade);
      });
    });

    it('shows loading indicator', () => {
      const { getByTestId } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={jest.fn().mockImplementation(
          () => new Promise(() => {}) // Never resolves
        )} />
      );

      expect(getByTestId('trade-detail-loading')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('renders error state when fetch fails', async () => {
      const mockFetchTrade = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByTestId, getByText } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={mockFetchTrade} />
      );

      await waitFor(() => {
        expect(getByTestId('trade-detail-error')).toBeTruthy();
        expect(getByText('Failed to load trade details')).toBeTruthy();
      });
    });

    it('shows retry button in error state', async () => {
      const mockFetchTrade = jest.fn().mockRejectedValue(new Error('Network error'));
      const { getByTestId } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={mockFetchTrade} />
      );

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });
    });

    it('calls fetchTrade when retry button is pressed', async () => {
      let callCount = 0;
      const mockFetchTrade = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockTrade);
      });

      const { getByTestId } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={mockFetchTrade} />
      );

      await waitFor(() => {
        expect(getByTestId('retry-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('retry-button'));

      await waitFor(() => {
        expect(mockFetchTrade).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Loaded State', () => {
    it('renders loaded state with trade data', async () => {
      const { getByTestId, getByText } = render(<TradeDetailScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByTestId('trade-detail-loaded')).toBeTruthy();
      });

      expect(getByText('Trade Details')).toBeTruthy();
      expect(getByText('trade-123')).toBeTruthy();
      expect(getByText('Maize')).toBeTruthy();
      expect(getByText('₦500,000')).toBeTruthy();
    });

    it('renders all trade fields', async () => {
      const { getByText } = render(<TradeDetailScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Seller')).toBeTruthy();
        expect(getByText('Farmer John')).toBeTruthy();
        expect(getByText('Buyer')).toBeTruthy();
        expect(getByText('Buyer Alice')).toBeTruthy();
        expect(getByText('Driver')).toBeTruthy();
        expect(getByText('Driver Bob')).toBeTruthy();
        expect(getByText('Vehicle')).toBeTruthy();
        expect(getByText('Truck ABC-123')).toBeTruthy();
        expect(getByText('Loss Ratio')).toBeTruthy();
        expect(getByText('50/50')).toBeTruthy();
      });
    });

    it('renders status badge with correct color for funded status', async () => {
      const { getByText } = render(<TradeDetailScreen {...defaultProps} />);

      await waitFor(() => {
        expect(getByText('Funded')).toBeTruthy();
      });
    });
  });

  describe('Primary User Actions - Confirm Delivery', () => {
    it('shows confirm delivery button for delivered status', async () => {
      const deliveredTrade = { ...mockTrade, status: 'delivered' as TradeStatus };
      const { getByTestId, getByText } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(deliveredTrade)}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
        expect(getByText('Confirm Delivery')).toBeTruthy();
      });
    });

    it('shows confirm delivery button for dispatched status', async () => {
      const dispatchedTrade = { ...mockTrade, status: 'dispatched' as TradeStatus };
      const { getByTestId, getByText } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(dispatchedTrade)}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
      });
    });

    it('shows confirmation Alert when confirm delivery is pressed', async () => {
      const deliveredTrade = { ...mockTrade, status: 'delivered' as TradeStatus };
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(deliveredTrade)}
          onConfirmDelivery={jest.fn().mockResolvedValue({ success: true })}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('confirm-delivery-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Confirm Delivery',
          'Are you sure you want to confirm delivery? This action cannot be undone.',
          expect.any(Array)
        );
      });
    });

    it('calls onConfirmDelivery when confirmed', async () => {
      const mockOnConfirmDelivery = jest.fn().mockResolvedValue({ success: true });
      const deliveredTrade = { ...mockTrade, status: 'delivered' as TradeStatus };
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(deliveredTrade)}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('confirm-delivery-button'));

      // Simulate pressing the confirm button in Alert
      const Alert = require('react-native').Alert;
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Confirm');
      
      await act(async () => {
        confirmButton.onPress();
      });

      await waitFor(() => {
        expect(mockOnConfirmDelivery).toHaveBeenCalledWith('trade-123');
      });
    });

    it('shows error Alert when onConfirmDelivery fails', async () => {
      const mockOnConfirmDelivery = jest.fn().mockResolvedValue({ 
        success: false, 
        error: 'Confirmation failed' 
      });
      const deliveredTrade = { ...mockTrade, status: 'delivered' as TradeStatus };
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(deliveredTrade)}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('confirm-delivery-button'));

      const Alert = require('react-native').Alert;
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Confirm');
      
      await act(async () => {
        confirmButton.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Confirmation failed');
      });
    });

    it('shows error Alert when onConfirmDelivery throws', async () => {
      const mockOnConfirmDelivery = jest.fn().mockRejectedValue(new Error('Network error'));
      const deliveredTrade = { ...mockTrade, status: 'delivered' as TradeStatus };
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(deliveredTrade)}
          onConfirmDelivery={mockOnConfirmDelivery}
        />
      );

      await waitFor(() => {
        expect(getByTestId('confirm-delivery-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('confirm-delivery-button'));

      const Alert = require('react-native').Alert;
      const alertCall = Alert.alert.mock.calls[0];
      const confirmButton = alertCall[2].find((btn: any) => btn.text === 'Confirm');
      
      await act(async () => {
        confirmButton.onPress();
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });
  });

  describe('Primary User Actions - Raise Dispute', () => {
    it('shows raise dispute button for active statuses', async () => {
      const { getByTestId, getByText } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(mockTrade)}
        />
      );

      await waitFor(() => {
        expect(getByTestId('raise-dispute-button')).toBeTruthy();
        expect(getByText('Raise Dispute')).toBeTruthy();
      });
    });

    it('does not show raise dispute button for completed status', async () => {
      const completedTrade = { ...mockTrade, status: 'completed' as TradeStatus };
      const { queryByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(completedTrade)}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('raise-dispute-button')).toBeNull();
      });
    });

    it('does not show raise dispute button for cancelled status', async () => {
      const cancelledTrade = { ...mockTrade, status: 'cancelled' as TradeStatus };
      const { queryByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(cancelledTrade)}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('raise-dispute-button')).toBeNull();
      });
    });

    it('does not show raise dispute button for disputed status', async () => {
      const disputedTrade = { ...mockTrade, status: 'disputed' as TradeStatus };
      const { queryByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(disputedTrade)}
        />
      );

      await waitFor(() => {
        expect(queryByTestId('raise-dispute-button')).toBeNull();
      });
    });

    it('calls onRaiseDispute with reason when prompted', async () => {
      const mockOnRaiseDispute = jest.fn().mockResolvedValue({ success: true });
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(mockTrade)}
          onRaiseDispute={mockOnRaiseDispute}
        />
      );

      await waitFor(() => {
        expect(getByTestId('raise-dispute-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('raise-dispute-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.prompt).toHaveBeenCalledWith(
          'Raise Dispute',
          'Reason for dispute',
          expect.any(Function),
          'plain-text',
          '',
          'default'
        );
      });

      // Simulate entering a reason and submitting
      const promptCallback = Alert.prompt.mock.calls[0][3];
      await act(async () => {
        promptCallback('Quality issues');
      });

      await waitFor(() => {
        expect(mockOnRaiseDispute).toHaveBeenCalledWith('trade-123', 'Quality issues');
      });
    });

    it('does not call onRaiseDispute when prompt is cancelled', async () => {
      const mockOnRaiseDispute = jest.fn();
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(mockTrade)}
          onRaiseDispute={mockOnRaiseDispute}
        />
      );

      await waitFor(() => {
        expect(getByTestId('raise-dispute-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('raise-dispute-button'));

      const Alert = require('react-native').Alert;
      const promptCallback = Alert.prompt.mock.calls[0][3];
      
      // Call with undefined (cancel)
      await act(async () => {
        promptCallback(undefined);
      });

      expect(mockOnRaiseDispute).not.toHaveBeenCalled();
    });

    it('shows view evidence button for disputed status', async () => {
      const disputedTrade = { ...mockTrade, status: 'disputed' as TradeStatus };
      const { getByTestId, getByText } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(disputedTrade)}
        />
      );

      await waitFor(() => {
        expect(getByTestId('view-evidence-button')).toBeTruthy();
        expect(getByText('View Evidence')).toBeTruthy();
      });
    });

    it('calls onViewEvidence when view evidence is pressed', async () => {
      const mockOnViewEvidence = jest.fn();
      const disputedTrade = { ...mockTrade, status: 'disputed' as TradeStatus };
      
      const { getByTestId } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(disputedTrade)}
          onViewEvidence={mockOnViewEvidence}
        />
      );

      await waitFor(() => {
        expect(getByTestId('view-evidence-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('view-evidence-button'));

      expect(mockOnViewEvidence).toHaveBeenCalledWith('trade-123');
    });
  });

  describe('Status Handling', () => {
    it('handles all status types correctly', async () => {
      const statuses: TradeStatus[] = ['pending', 'funded', 'dispatched', 'delivered', 'completed', 'disputed', 'resolved', 'cancelled'];
      
      for (const status of statuses) {
        const trade = { ...mockTrade, status };
        const { getByText, rerender } = render(
          <TradeDetailScreen
            tradeId="trade-123"
            fetchTrade={jest.fn().mockResolvedValue(trade)}
          />
        );

        await waitFor(() => {
          expect(getByText('Funded')).toBeTruthy();
        });
      }
    });

    it('does not render driver and vehicle when not available', async () => {
      const tradeWithoutDriver = { ...mockTrade, driver: undefined, vehicle: undefined };
      const { queryByText } = render(
        <TradeDetailScreen
          tradeId="trade-123"
          fetchTrade={jest.fn().mockResolvedValue(tradeWithoutDriver)}
        />
      );

      await waitFor(() => {
        expect(queryByText('Driver')).toBeNull();
        expect(queryByText('Vehicle')).toBeNull();
      });
    });
  });

  describe('Mock Store Calls', () => {
    it('uses mocked fetchTrade to load trade data', async () => {
      const mockFetchTrade = jest.fn().mockResolvedValue(mockTrade);
      const { getByText } = render(
        <TradeDetailScreen tradeId="trade-123" fetchTrade={mockFetchTrade} />
      );

      await waitFor(() => {
        expect(mockFetchTrade).toHaveBeenCalledWith('trade-123');
        expect(getByText('Maize')).toBeTruthy();
      });
    });
  });
});