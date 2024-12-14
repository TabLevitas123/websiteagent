import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AnalyticsDashboard } from '../../components/AnalyticsDashboard';
import { MetricsProvider } from '../../contexts/MetricsContext';
import { mockMetricsData } from '../__mocks__/metricsData';
import '@testing-library/jest-dom';

// Mock API calls
jest.mock('../../api/metrics', () => ({
  fetchMetrics: jest.fn(() => Promise.resolve(mockMetricsData)),
  fetchTimeSeries: jest.fn(() => Promise.resolve(mockMetricsData.timeSeries)),
}));

describe('AnalyticsDashboard', () => {
  const renderDashboard = () => {
    return render(
      <MetricsProvider>
        <AnalyticsDashboard />
      </MetricsProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard Layout', () => {
    it('renders all dashboard sections', () => {
      renderDashboard();

      expect(screen.getByTestId('platform-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('agent-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('marketplace-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('user-metrics')).toBeInTheDocument();
    });

    it('displays loading state initially', () => {
      renderDashboard();

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Platform Metrics', () => {
    it('displays total agents count', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Agents')).toBeInTheDocument();
        expect(screen.getByText(mockMetricsData.platform.totalAgents.toString())).toBeInTheDocument();
      });
    });

    it('displays total users count', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText(mockMetricsData.platform.totalUsers.toString())).toBeInTheDocument();
      });
    });

    it('displays total transactions', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Total Transactions')).toBeInTheDocument();
        expect(screen.getByText(mockMetricsData.platform.totalTransactions.toString())).toBeInTheDocument();
      });
    });
  });

  describe('Time Frame Selection', () => {
    it('changes time frame when selector is used', async () => {
      renderDashboard();

      const timeFrameSelector = screen.getByTestId('timeframe-selector');
      fireEvent.change(timeFrameSelector, { target: { value: '7d' } });

      await waitFor(() => {
        expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
      });
    });

    it('updates metrics when time frame changes', async () => {
      renderDashboard();

      const timeFrameSelector = screen.getByTestId('timeframe-selector');
      fireEvent.change(timeFrameSelector, { target: { value: '30d' } });

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Charts', () => {
    it('renders transaction volume chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('transaction-volume-chart')).toBeInTheDocument();
      });
    });

    it('renders agent growth chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('agent-growth-chart')).toBeInTheDocument();
      });
    });

    it('renders user growth chart', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('user-growth-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const mockError = new Error('Failed to fetch metrics');
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
      });
    });

    it('shows retry button when data loading fails', async () => {
      const mockError = new Error('Failed to fetch metrics');
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(mockError);

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Test retry functionality
      jest.spyOn(global, 'fetch').mockResolvedValueOnce(mockMetricsData);
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.queryByText('Error loading metrics')).not.toBeInTheDocument();
      });
    });
  });

  describe('Data Refresh', () => {
    it('automatically refreshes data at intervals', async () => {
      jest.useFakeTimers();
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      jest.advanceTimersByTime(300000); // 5 minutes

      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });

    it('allows manual refresh via button', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Data Export', () => {
    it('allows CSV export of metrics data', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const exportButton = screen.getByTestId('export-button');
      const mockUrl = 'blob:http://localhost:3000/123';
      const mockClick = jest.fn();

      // Mock URL.createObjectURL
      window.URL.createObjectURL = jest.fn(() => mockUrl);

      // Mock anchor click
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(mockClick);

      fireEvent.click(exportButton);

      expect(mockClick).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for mobile screens', async () => {
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-view')).not.toBeInTheDocument();
      });
    });

    it('adjusts layout for tablet screens', async () => {
      window.innerWidth = 768;
      window.innerHeight = 1024;
      window.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('tablet-view')).toBeInTheDocument();
      });
    });

    it('adjusts layout for desktop screens', async () => {
      window.innerWidth = 1920;
      window.innerHeight = 1080;
      window.dispatchEvent(new Event('resize'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('desktop-view')).toBeInTheDocument();
        expect(screen.queryByTestId('mobile-view')).not.toBeInTheDocument();
      });
    });
  });
});
