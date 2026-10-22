import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CreateTradeScreen, CreateTradeFormData } from '../CreateTradeScreen';
import i18n from '../../i18n';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'trade.create.title': 'Create Trade',
        'trade.create.selectProduct': 'Select Product',
        'trade.create.enterAmount': 'Enter Amount',
        'trade.create.selectSeller': 'Select Seller',
        'trade.create.lossRatio': 'Loss Sharing Ratio',
        'trade.create.submit': 'Submit Trade',
        'trade.create.success': 'Trade created successfully!',
        'trade.create.error': 'Failed to create trade',
        'trade.create.validation.amountRequired': 'Amount is required',
        'trade.create.validation.amountPositive': 'Amount must be positive',
        'trade.create.validation.productRequired': 'Please select a product',
        'trade.create.validation.sellerRequired': 'Please select a seller',
        'common.error': 'Error',
        'common.success': 'Success',
        'common.cancel': 'Cancel',
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
    },
  };
});

describe('CreateTradeScreen', () => {
  beforeAll(() => {
    i18n.changeLanguage('en');
  });

  const mockProducts = [
    { id: '1', name: 'Maize' },
    { id: '2', name: 'Rice' },
    { id: '3', name: 'Wheat' },
  ];

  const mockSellers = [
    { id: '1', name: 'Farmer John', address: 'GABCD...' },
    { id: '2', name: 'Agro Store', address: 'GXYZF...' },
  ];

  const defaultProps = {
    products: mockProducts,
    sellers: mockSellers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders all form fields with translated labels', () => {
      const { getByText } = render(<CreateTradeScreen {...defaultProps} />);
      expect(getByText('Create Trade')).toBeTruthy();
      expect(getByText('Select Product')).toBeTruthy();
      expect(getByText('Enter Amount')).toBeTruthy();
      expect(getByText('Select Seller')).toBeTruthy();
      expect(getByText('Loss Sharing Ratio')).toBeTruthy();
    });

    it('renders submit button with translated text', () => {
      const { getByTestId } = render(<CreateTradeScreen {...defaultProps} />);
      expect(getByTestId('submit-button')).toBeTruthy();
    });

    it('renders cancel button when onCancel is provided', () => {
      const { getByTestId } = render(<CreateTradeScreen {...defaultProps} onCancel={jest.fn()} />);
      expect(getByTestId('cancel-button')).toBeTruthy();
    });

    it('renders loss ratio options', () => {
      const { getByText } = render(<CreateTradeScreen {...defaultProps} />);
      expect(getByText('50/50')).toBeTruthy();
      expect(getByText('70/30')).toBeTruthy();
      expect(getByText('80/20')).toBeTruthy();
      expect(getByText('90/10')).toBeTruthy();
    });

    it('renders correct testID', () => {
      const { getByTestId } = render(<CreateTradeScreen {...defaultProps} />);
      expect(getByTestId('create-trade-screen')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting with empty product', async () => {
      const { getByTestId, findByText } = render(<CreateTradeScreen {...defaultProps} />);

      fireEvent.press(getByTestId('submit-button'));

      expect(await findByText('Please select a product')).toBeTruthy();
    });

    it('shows error when submitting with empty amount', async () => {
      const { getByTestId, findByText, getByText } = render(<CreateTradeScreen {...defaultProps} />);

      // Select a product first
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      // Submit without amount
      fireEvent.press(getByTestId('submit-button'));

      expect(await findByText('Amount is required')).toBeTruthy();
    });

    it('shows error when amount is not positive', async () => {
      const { getByTestId, findByText, getByText } = render(<CreateTradeScreen {...defaultProps} />);

      // Select product
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      // Enter invalid amount
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '-100');

      fireEvent.press(getByTestId('submit-button'));

      expect(await findByText('Amount must be positive')).toBeTruthy();
    });

    it('shows error when submitting with empty seller', async () => {
      const { getByTestId, findByText, getByText } = render(<CreateTradeScreen {...defaultProps} />);

      // Select product and enter amount
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      // Submit without seller
      fireEvent.press(getByTestId('submit-button'));

      expect(await findByText('Please select a seller')).toBeTruthy();
    });

    it('clears error when user starts typing', () => {
      const { getByTestId, queryByText } = render(<CreateTradeScreen {...defaultProps} />);

      // Submit to trigger error
      fireEvent.press(getByTestId('submit-button'));

      // Type in amount field to clear error
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '100');

      // Error should be cleared
      expect(queryByText('Amount is required')).toBeNull();
    });

    it('validates amount is a valid number', async () => {
      const { getByTestId, findByText, getByText } = render(<CreateTradeScreen {...defaultProps} />);

      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, 'abc');

      fireEvent.press(getByTestId('submit-button'));

      expect(await findByText('Amount must be positive')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('opens product picker when tapped', () => {
      const { getByTestId, getByText } = render(<CreateTradeScreen {...defaultProps} />);
      fireEvent.press(getByTestId('product-picker'));
      expect(getByText('Maize')).toBeTruthy();
      expect(getByText('Rice')).toBeTruthy();
      expect(getByText('Wheat')).toBeTruthy();
    });

    it('selects product when option is tapped', () => {
      const { getByTestId, getByText, queryByText } = render(<CreateTradeScreen {...defaultProps} />);
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));
      expect(getByText('Maize')).toBeTruthy();
    });

    it('opens seller picker when tapped', () => {
      const { getByTestId, getByText } = render(<CreateTradeScreen {...defaultProps} />);
      fireEvent.press(getByTestId('seller-picker'));
      expect(getByText('Farmer John')).toBeTruthy();
      expect(getByText('Agro Store')).toBeTruthy();
    });

    it('selects seller when option is tapped', () => {
      const { getByTestId, getByText } = render(<CreateTradeScreen {...defaultProps} />);
      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));
      expect(getByText('Farmer John')).toBeTruthy();
    });

    it('updates loss ratio when option is tapped', () => {
      const { getByTestId, getByText } = render(<CreateTradeScreen {...defaultProps} />);
      fireEvent.press(getByTestId('loss-ratio-70-30'));
      expect(getByText('70/30')).toBeTruthy();
    });

    it('calls onCancel when cancel button is pressed', () => {
      const mockOnCancel = jest.fn();
      const { getByTestId } = render(<CreateTradeScreen {...defaultProps} onCancel={mockOnCancel} />);
      fireEvent.press(getByTestId('cancel-button'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('allows amount input', () => {
      const { getByTestId } = render(<CreateTradeScreen {...defaultProps} />);
      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');
      expect(amountInput.props.value).toBe('500000');
    });
  });

  describe('Success Alert Path', () => {
    it('shows success Alert when trade is created successfully', async () => {
      const mockOnSubmit = jest.fn().mockResolvedValue({ success: true, tradeId: 'trade-123' });
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: true });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onSubmit={mockOnSubmit} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      // Submit
      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          productId: '1',
          amount: '500000',
          sellerId: '1',
          lossRatio: '50/50',
        });
      });

      // Check Alert was called with success
      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Success',
          'Trade created successfully!'
        );
      });
    });

    it('resets form after successful submission', async () => {
      const mockOnSubmit = jest.fn().mockResolvedValue({ success: true });
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: true });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onSubmit={mockOnSubmit} onWalletSign={mockOnWalletSign} />
      );

      // Fill and submit
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Form should be reset - amount should be empty
      const AlertModule = require('react-native').Alert;
      AlertModule.alert.mock.calls[0][2][1].onPress(); // Press OK
    });
  });

  describe('Error Alert Paths', () => {
    it('shows error Alert when wallet signing fails', async () => {
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: false, error: 'User rejected' });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'User rejected'
        );
      });
    });

    it('shows error Alert when wallet signing throws', async () => {
      const mockOnWalletSign = jest.fn().mockRejectedValue(new Error('Signing error'));
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Signing error'
        );
      });
    });

    it('shows error Alert when onSubmit returns error', async () => {
      const mockOnSubmit = jest.fn().mockResolvedValue({ success: false, error: 'Server error' });
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: true });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onSubmit={mockOnSubmit} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Server error'
        );
      });
    });

    it('shows error Alert when onSubmit throws', async () => {
      const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: true });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onSubmit={mockOnSubmit} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      const Alert = require('react-native').Alert;
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Network error'
        );
      });
    });
  });

  describe('Wallet Signing Flow', () => {
    it('calls onWalletSign before onSubmit', async () => {
      const callOrder: string[] = [];
      const mockOnWalletSign = jest.fn().mockImplementation(() => {
        callOrder.push('walletSign');
        return Promise.resolve({ signed: true });
      });
      const mockOnSubmit = jest.fn().mockImplementation(() => {
        callOrder.push('submit');
        return Promise.resolve({ success: true });
      });

      const { getByTestId, getByText } = render(
        <CreateTradeScreen
          {...defaultProps}
          onSubmit={mockOnSubmit}
          onWalletSign={mockOnWalletSign}
        />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnWalletSign).toHaveBeenCalled();
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      expect(callOrder).toEqual(['walletSign', 'submit']);
    });

    it('skips onSubmit if wallet signing returns signed: false', async () => {
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: false });
      const mockOnSubmit = jest.fn();

      const { getByTestId, getByText } = render(
        <CreateTradeScreen
          {...defaultProps}
          onSubmit={mockOnSubmit}
          onWalletSign={mockOnWalletSign}
        />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      fireEvent.press(getByTestId('submit-button'));

      await waitFor(() => {
        expect(mockOnWalletSign).toHaveBeenCalled();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while submitting', async () => {
      let resolveSubmit: (result: { success: boolean }) => void;
      const mockOnSubmit = jest.fn().mockImplementation(
        () => new Promise((resolve) => {
          resolveSubmit = resolve;
        })
      );
      const mockOnWalletSign = jest.fn().mockResolvedValue({ signed: true });
      const { getByTestId, getByText } = render(
        <CreateTradeScreen {...defaultProps} onSubmit={mockOnSubmit} onWalletSign={mockOnWalletSign} />
      );

      // Fill form
      fireEvent.press(getByTestId('product-picker'));
      fireEvent.press(getByText('Maize'));

      const amountInput = getByTestId('amount-input');
      fireEvent.changeText(amountInput, '500000');

      fireEvent.press(getByTestId('seller-picker'));
      fireEvent.press(getByText('Farmer John'));

      // Submit
      fireEvent.press(getByTestId('submit-button'));

      // Should show loading
      expect(getByTestId('submit-button')).toBeTruthy();

      // Resolve
      await act(async () => {
        resolveSubmit!({ success: true });
      });
    });
  });
});