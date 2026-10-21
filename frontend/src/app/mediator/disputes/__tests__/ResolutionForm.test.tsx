import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResolutionForm from '../[id]/ResolutionForm';

const BASE_PROPS = {
  disputeId: 'dispute-123',
  amount: 100_000,
  feeBps: 200, // 2%
  lossRatioBps: 6000, // 60% buyer
};

describe('ResolutionForm', () => {
  describe('outcome selection', () => {
    it('renders all outcome radio options', () => {
      render(<ResolutionForm {...BASE_PROPS} />);

      expect(screen.getByLabelText(/full refund to buyer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full release to seller/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/loss ratio split/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/custom split/i)).toBeInTheDocument();
    });

    it('defaults to loss_ratio outcome', () => {
      render(<ResolutionForm {...BASE_PROPS} />);

      expect(screen.getByLabelText(/loss ratio split/i)).toBeChecked();
    });

    it('shows custom bps input only when custom outcome is selected', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      expect(screen.queryByLabelText(/buyer share/i)).not.toBeInTheDocument();

      await user.click(screen.getByLabelText(/custom split/i));

      expect(screen.getByLabelText(/buyer share/i)).toBeInTheDocument();
    });

    it('hides custom bps input when switching back to loss_ratio', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.click(screen.getByLabelText(/custom split/i));
      expect(screen.getByLabelText(/buyer share/i)).toBeInTheDocument();

      await user.click(screen.getByLabelText(/loss ratio split/i));
      expect(screen.queryByLabelText(/buyer share/i)).not.toBeInTheDocument();
    });
  });

  describe('split preview', () => {
    it('shows correct preview for full_buyer outcome', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.click(screen.getByLabelText(/full refund to buyer/i));

      // fee = floor(100000 * 200 / 10000) = 2000
      // distributable = 98000, buyer gets all = 98000, seller = 0
      expect(screen.getByText('98,000')).toBeInTheDocument();
      expect(screen.getByText('2,000')).toBeInTheDocument();
    });

    it('shows correct preview for full_seller outcome', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.click(screen.getByLabelText(/full release to seller/i));

      // buyer = 0, seller = 98000
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it('shows correct preview for loss_ratio using lossRatioBps', () => {
      render(<ResolutionForm {...BASE_PROPS} />);

      // buyer = floor(98000 * 6000 / 10000) = 58800, seller = 39200
      expect(screen.getByText('58,800')).toBeInTheDocument();
      expect(screen.getByText('39,200')).toBeInTheDocument();
    });

    it('updates preview when custom bps input changes', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.click(screen.getByLabelText(/custom split/i));
      const bpsInput = screen.getByLabelText(/buyer share/i);
      await user.clear(bpsInput);
      await user.type(bpsInput, '5000');

      // buyer = floor(98000 * 5000 / 10000) = 49000
      expect(screen.getByText('49,000')).toBeInTheDocument();
    });
  });

  describe('rationale field', () => {
    it('renders rationale textarea', () => {
      render(<ResolutionForm {...BASE_PROPS} />);
      expect(screen.getByRole('textbox', { name: /rationale/i })).toBeInTheDocument();
    });

    it('submit button is disabled when rationale is empty', () => {
      render(<ResolutionForm {...BASE_PROPS} />);
      expect(screen.getByRole('button', { name: /sign resolution/i })).toBeDisabled();
    });

    it('submit button is enabled when rationale has text', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.type(screen.getByRole('textbox', { name: /rationale/i }), 'Buyer provided evidence');
      expect(screen.getByRole('button', { name: /sign resolution/i })).not.toBeDisabled();
    });

    it('submit button is disabled when rationale is only whitespace', async () => {
      const user = userEvent.setup();
      render(<ResolutionForm {...BASE_PROPS} />);

      await user.type(screen.getByRole('textbox', { name: /rationale/i }), '   ');
      expect(screen.getByRole('button', { name: /sign resolution/i })).toBeDisabled();
    });
  });

  describe('form submission', () => {
    it('calls onSubmit with correct payload for loss_ratio outcome', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<ResolutionForm {...BASE_PROPS} onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox', { name: /rationale/i }), 'Clear evidence');
      await user.click(screen.getByRole('button', { name: /sign resolution/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            disputeId: 'dispute-123',
            outcome: 'loss_ratio',
            buyerBps: 6000,
            rationale: 'Clear evidence',
          }),
        );
      });
    });

    it('calls onSubmit with correct payload for full_buyer outcome', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      render(<ResolutionForm {...BASE_PROPS} onSubmit={onSubmit} />);

      await user.click(screen.getByLabelText(/full refund to buyer/i));
      await user.type(screen.getByRole('textbox', { name: /rationale/i }), 'Buyer wins');
      await user.click(screen.getByRole('button', { name: /sign resolution/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            outcome: 'full_buyer',
            buyerBps: 0,
          }),
        );
      });
    });

    it('shows submitting state while onSubmit is pending', async () => {
      const user = userEvent.setup();
      let resolve: () => void;
      const onSubmit = jest.fn(
        () => new Promise<void>((res) => { resolve = res; }),
      );
      render(<ResolutionForm {...BASE_PROPS} onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox', { name: /rationale/i }), 'In progress');
      await user.click(screen.getByRole('button', { name: /sign resolution/i }));

      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
      resolve!();
    });

    it('does not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn();
      render(<ResolutionForm {...BASE_PROPS} onSubmit={onSubmit} />);

      // Don't fill rationale — button is disabled so we simulate direct form submission
      const form = screen.getByRole('button', { name: /sign resolution/i }).closest('form')!;
      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('error during onSubmit re-enables the submit button', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockRejectedValue(new Error('API error'));
      render(<ResolutionForm {...BASE_PROPS} onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox', { name: /rationale/i }), 'test');
      await user.click(screen.getByRole('button', { name: /sign resolution/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign resolution/i })).not.toBeDisabled();
      });
    });
  });
});
