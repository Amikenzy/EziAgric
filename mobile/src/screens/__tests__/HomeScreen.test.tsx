import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HomeScreen, TradeItem } from '../HomeScreen';
import i18n from '../../i18n';

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'home.welcome': 'Welcome to EziAgric',
        'home.subtitle': 'Secure agricultural trade on the blockchain',
        'home.createTrade': 'Create Trade',
        'home.myTrades': 'My Trades',
        'home.marketplace': 'Marketplace',
        'home.settings': 'Settings',
        'home.recentTrades': 'Recent Trades',
        'home.noTrades': 'No trades yet',
        'home.viewAll': 'View All',
        'home.activeTrades': 'Active Trades',
        'home.completedTrades': 'Completed Trades',
      };
      return keys[key] || key;
    },
  }),
}));

describe('HomeScreen', () => {
  beforeAll(() => {
    i18n.changeLanguage('en');
  });

  const mockTrades: TradeItem[] = [
    { id: '1', product: 'Maize', amount: '₦500,000', status: 'active' },
    { id: '2', product: 'Rice', amount: '₦350,000', status: 'completed' },
  ];

  it('renders welcome message with translated string', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Welcome to EziAgric')).toBeTruthy();
  });

  it('renders subtitle with translated string', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Secure agricultural trade on the blockchain')).toBeTruthy();
  });

  it('renders all action buttons with translated labels', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('Create Trade')).toBeTruthy();
    expect(getByText('My Trades')).toBeTruthy();
    expect(getByText('Marketplace')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });

  it('calls onCreateTrade when create trade button is pressed', () => {
    const mockOnCreateTrade = jest.fn();
    const { getByTestId } = render(<HomeScreen onCreateTrade={mockOnCreateTrade} />);
    fireEvent.press(getByTestId('create-trade-button'));
    expect(mockOnCreateTrade).toHaveBeenCalledTimes(1);
  });

  it('calls onViewTrades when my trades button is pressed', () => {
    const mockOnViewTrades = jest.fn();
    const { getByTestId } = render(<HomeScreen onViewTrades={mockOnViewTrades} />);
    fireEvent.press(getByTestId('my-trades-button'));
    expect(mockOnViewTrades).toHaveBeenCalledTimes(1);
  });

  it('calls onViewMarketplace when marketplace button is pressed', () => {
    const mockOnViewMarketplace = jest.fn();
    const { getByTestId } = render(<HomeScreen onViewMarketplace={mockOnViewMarketplace} />);
    fireEvent.press(getByTestId('marketplace-button'));
    expect(mockOnViewMarketplace).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenSettings when settings button is pressed', () => {
    const mockOnOpenSettings = jest.fn();
    const { getByTestId } = render(<HomeScreen onOpenSettings={mockOnOpenSettings} />);
    fireEvent.press(getByTestId('settings-button'));
    expect(mockOnOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders recent trades section with translated title', () => {
    const { getByText } = render(<HomeScreen recentTrades={mockTrades} />);
    expect(getByText('Recent Trades')).toBeTruthy();
  });

  it('renders view all button with translated text', () => {
    const { getByText } = render(<HomeScreen />);
    expect(getByText('View All')).toBeTruthy();
  });

  it('calls onViewTrades when view all is pressed', () => {
    const mockOnViewTrades = jest.fn();
    const { getByTestId } = render(<HomeScreen onViewTrades={mockOnViewTrades} />);
    fireEvent.press(getByTestId('view-all-button'));
    expect(mockOnViewTrades).toHaveBeenCalledTimes(1);
  });

  it('renders trade items when provided', () => {
    const { getByText } = render(<HomeScreen recentTrades={mockTrades} />);
    expect(getByText('Maize')).toBeTruthy();
    expect(getByText('₦500,000')).toBeTruthy();
    expect(getByText('Rice')).toBeTruthy();
    expect(getByText('₦350,000')).toBeTruthy();
  });

  it('renders active status with translated text', () => {
    const { getByText } = render(<HomeScreen recentTrades={mockTrades} />);
    expect(getByText('Active Trades')).toBeTruthy();
  });

  it('renders completed status with translated text', () => {
    const { getByText } = render(<HomeScreen recentTrades={mockTrades} />);
    expect(getByText('Completed Trades')).toBeTruthy();
  });

  it('shows empty state when no trades', () => {
    const { getByText } = render(<HomeScreen recentTrades={[]} />);
    expect(getByText('No trades yet')).toBeTruthy();
  });

  it('calls onTradePress when trade item is pressed', () => {
    const mockOnTradePress = jest.fn();
    const { getByTestId } = render(
      <HomeScreen recentTrades={mockTrades} onTradePress={mockOnTradePress} />
    );
    fireEvent.press(getByTestId('trade-item-1'));
    expect(mockOnTradePress).toHaveBeenCalledWith('1');
  });

  it('renders correctly with empty props', () => {
    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('home-screen')).toBeTruthy();
  });

  it('renders trades list with testID', () => {
    const { getByTestId } = render(<HomeScreen recentTrades={mockTrades} />);
    expect(getByTestId('trades-list')).toBeTruthy();
  });
});