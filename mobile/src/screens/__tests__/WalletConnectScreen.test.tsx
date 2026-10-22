import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { WalletConnectScreen, WalletConnectScreenProps, statusLabels } from '../WalletConnectScreen';
import i18n from '../../i18n';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'wallet.appName': 'EziAgric',
        'wallet.tagline': 'Trust as a Service for Agricultural Trade',
        'wallet.connect': 'Connect Wallet',
        'wallet.disconnect': 'Disconnect',
        'wallet.instructions': 'To get started, connect your Stellar wallet using Freighter or Albedo.',
        'wallet.status.connected': 'Connected',
        'wallet.status.disconnected': 'Disconnected',
        'wallet.status.pending': 'Pending',
        'wallet.status.error': 'Connection Error',
      };
      return keys[key] || key;
    },
  }),
}));

describe('WalletConnectScreen', () => {
  beforeAll(() => {
    i18n.changeLanguage('en');
  });

  const defaultProps: WalletConnectScreenProps = {};

  it('renders app name and tagline', () => {
    const { getByText } = render(<WalletConnectScreen {...defaultProps} />);
    expect(getByText('EziAgric')).toBeTruthy();
    expect(getByText('Trust as a Service for Agricultural Trade')).toBeTruthy();
  });

  it('shows disconnected status by default', () => {
    const { getByText } = render(<WalletConnectScreen {...defaultProps} />);
    expect(getByText('Disconnected')).toBeTruthy();
  });

  it('renders connect button when disconnected', () => {
    const { getByTestId } = render(<WalletConnectScreen {...defaultProps} />);
    expect(getByTestId('connect-wallet-button')).toBeTruthy();
  });

  it('calls onConnect when connect button is pressed', async () => {
    const mockOnConnect = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(<WalletConnectScreen onConnect={mockOnConnect} />);

    await act(async () => {
      fireEvent.press(getByTestId('connect-wallet-button'));
    });

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('shows pending status while connecting', async () => {
    let resolveConnect: () => void;
    const mockOnConnect = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveConnect = resolve;
      })
    );
    const { getByText, findByText } = render(
      <WalletConnectScreen onConnect={mockOnConnect} initialStatus="disconnected" />
    );

    const connectButton = getByText('Connect Wallet');
    fireEvent.press(connectButton);

    expect(getByText('Pending')).toBeTruthy();

    await act(async () => {
      resolveConnect!();
    });

    await waitFor(() => {
      expect(getByText('Connected')).toBeTruthy();
    });
  });

  it('shows error status when connection fails', async () => {
    const mockOnConnect = jest.fn().mockRejectedValue(new Error('Connection failed'));
    const { getByText } = render(<WalletConnectScreen onConnect={mockOnConnect} />);

    const connectButton = getByText('Connect Wallet');
    fireEvent.press(connectButton);

    await waitFor(() => {
      expect(getByText('Connection Error')).toBeTruthy();
    });
  });

  it('renders disconnect button when connected', () => {
    const { getByTestId } = render(<WalletConnectScreen initialStatus="connected" />);
    expect(getByTestId('disconnect-wallet-button')).toBeTruthy();
  });

  it('calls onDisconnect when disconnect button is pressed', () => {
    const mockOnDisconnect = jest.fn();
    const { getByTestId } = render(
      <WalletConnectScreen initialStatus="connected" onDisconnect={mockOnDisconnect} />
    );

    fireEvent.press(getByTestId('disconnect-wallet-button'));
    expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
  });

  it('resets to disconnected status after disconnect', () => {
    const mockOnDisconnect = jest.fn();
    const { getByText } = render(
      <WalletConnectScreen initialStatus="connected" onDisconnect={mockOnDisconnect} />
    );

    fireEvent.press(getByText('Disconnect'));
    expect(getByText('Disconnected')).toBeTruthy();
  });

  it('renders instructions text', () => {
    const { getByText } = render(<WalletConnectScreen {...defaultProps} />);
    expect(
      getByText('To get started, connect your Stellar wallet using Freighter or Albedo.')
    ).toBeTruthy();
  });

  describe('statusLabels', () => {
    it('has keys for all wallet statuses', () => {
      expect(statusLabels.connected).toBe('wallet.status.connected');
      expect(statusLabels.disconnected).toBe('wallet.status.disconnected');
      expect(statusLabels.pending).toBe('wallet.status.pending');
      expect(statusLabels.error).toBe('wallet.status.error');
    });
  });
});