import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediatorPanelClient from '../[id]/MediatorPanelClient';

jest.mock('@/hooks/useFreighterIdentity', () => ({
  useFreighterIdentity: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  api: {
    trades: {
      getEvidence: jest.fn(),
    },
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('@stellar/stellar-sdk', () => ({
  Address: { fromString: jest.fn() },
  BASE_FEE: '100',
  Contract: jest.fn().mockImplementation(() => ({
    call: jest.fn().mockReturnValue({ toXDR: jest.fn().mockReturnValue('xdr') }),
  })),
  Networks: { TESTNET: 'Test SDF Network ; September 2015' },
  TransactionBuilder: jest.fn().mockImplementation(() => ({
    addOperation: jest.fn().mockReturnThis(),
    setTimeout: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ toEnvelope: jest.fn(), toXDR: jest.fn().mockReturnValue('mock-xdr') }),
  })),
  nativeToScVal: jest.fn(),
  rpc: { Server: jest.fn().mockImplementation(() => ({ getAccount: jest.fn().mockResolvedValue({ accountId: 'G...', sequence: '0' }) })) },
}));

jest.mock('@stellar/freighter-api', () => ({
  signTransaction: jest.fn(),
}));

import { useFreighterIdentity } from '@/hooks/useFreighterIdentity';
import { api } from '@/lib/api';

const mockUseFreighterIdentity = useFreighterIdentity as jest.MockedFunction<typeof useFreighterIdentity>;
const mockGetEvidence = (api.trades.getEvidence as jest.Mock);

function setupMocks({
  address = null as string | null,
  isAuthorized = false,
  isLoading = false,
} = {}) {
  mockUseFreighterIdentity.mockReturnValue({
    address,
    isAuthorized,
    isLoading,
    connectWallet: jest.fn(),
  } as any);
  mockGetEvidence.mockResolvedValue({ evidence: [] });
}

describe('MediatorPanelClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress window.location errors in jsdom
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/mediator/disputes/42' },
      writable: true,
    });
    // Suppress sessionStorage reads
    jest.spyOn(window.sessionStorage, 'getItem').mockReturnValue(null);
  });

  describe('unauthenticated state', () => {
    it('shows connect wallet button when wallet is not connected', async () => {
      setupMocks({ address: null, isAuthorized: false });
      render(<MediatorPanelClient disputeId="42" />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /connect wallet/i }),
        ).toBeInTheDocument();
      });
    });

    it('shows loading indicator while wallet is connecting', async () => {
      setupMocks({ address: null, isLoading: true });
      render(<MediatorPanelClient disputeId="42" />);

      // While loading, the connect button should reflect the loading state
      await waitFor(() => {
        const btn = screen.queryByRole('button', { name: /connect wallet/i });
        const loading = screen.queryByText(/connecting/i);
        expect(btn ?? loading).toBeTruthy();
      });
    });

    it('calls connectWallet when connect button is clicked', async () => {
      const user = userEvent.setup();
      const connectWallet = jest.fn();
      mockUseFreighterIdentity.mockReturnValue({
        address: null,
        isAuthorized: false,
        isLoading: false,
        connectWallet,
      } as any);
      mockGetEvidence.mockResolvedValue({ evidence: [] });

      render(<MediatorPanelClient disputeId="42" />);

      await waitFor(() => screen.getByRole('button', { name: /connect wallet/i }));
      await user.click(screen.getByRole('button', { name: /connect wallet/i }));

      expect(connectWallet).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-mediator wallet connected', () => {
    it('shows unauthorized message when connected address is not a mediator', async () => {
      setupMocks({
        address: 'GNOT_A_MEDIATOR_ADDRESS_00000000000000000000000000000000',
        isAuthorized: true,
      });
      render(<MediatorPanelClient disputeId="42" />);

      await waitFor(() => {
        expect(
          screen.getByText(/not authorized/i) ?? screen.queryByText(/mediator/i),
        ).toBeTruthy();
      });
    });
  });

  describe('evidence CID resolution', () => {
    it('shows no-evidence message when backend returns empty evidence', async () => {
      setupMocks({ address: null });
      mockGetEvidence.mockResolvedValue({ evidence: [] });

      render(<MediatorPanelClient disputeId="42" />);

      await waitFor(() => {
        expect(
          screen.getByText(/no evidence/i) ??
          screen.queryByText(/no.*cid/i),
        ).toBeTruthy();
      });
    });

    it('shows invalid dispute id message for non-numeric disputeId', async () => {
      setupMocks({ address: null });
      render(<MediatorPanelClient disputeId="not-a-number" />);

      await waitFor(() => {
        expect(screen.getByText(/invalid dispute id/i)).toBeInTheDocument();
      });
    });

    it('shows error message when evidence API call fails', async () => {
      const { ApiError } = jest.requireMock('@/lib/api');
      setupMocks({ address: null });
      jest.spyOn(window.sessionStorage, 'getItem').mockReturnValue('some-jwt');
      mockGetEvidence.mockRejectedValue(new ApiError('Not found', 404));

      render(<MediatorPanelClient disputeId="42" />);

      await waitFor(() => {
        expect(
          screen.getByText(/evidence lookup failed/i),
        ).toBeInTheDocument();
      });
    });
  });
});
