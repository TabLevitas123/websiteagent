import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { AgentProvider } from '../../contexts/AgentContext';
import { MetricsProvider } from '../../contexts/MetricsContext';
import { mockAgentData, mockAgentList } from '../__mocks__/agentData';
import { mockMetricsData } from '../__mocks__/metricsData';

// Mock API calls
jest.mock('../../api/agents');
jest.mock('../../api/metrics');
jest.mock('../../api/auth');

describe('App Integration', () => {
  const renderApp = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <AgentProvider>
            <MetricsProvider>
              <App />
            </MetricsProvider>
          </AgentProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful authentication
    (window as any).ethereum = {
      request: jest.fn().mockResolvedValue('0x123'),
      on: jest.fn(),
      removeListener: jest.fn(),
    };
  });

  describe('Navigation', () => {
    it('should navigate between main sections', async () => {
      renderApp();

      // Check initial render
      expect(screen.getByTestId('home-page')).toBeInTheDocument();

      // Navigate to marketplace
      fireEvent.click(screen.getByText('Marketplace'));
      await waitFor(() => {
        expect(screen.getByTestId('marketplace-page')).toBeInTheDocument();
      });

      // Navigate to analytics
      fireEvent.click(screen.getByText('Analytics'));
      await waitFor(() => {
        expect(screen.getByTestId('analytics-page')).toBeInTheDocument();
      });

      // Navigate to profile
      fireEvent.click(screen.getByText('Profile'));
      await waitFor(() => {
        expect(screen.getByTestId('profile-page')).toBeInTheDocument();
      });
    });

    it('should handle protected routes', async () => {
      renderApp();

      // Try accessing protected route while not authenticated
      (window as any).ethereum = undefined;
      fireEvent.click(screen.getByText('Profile'));

      await waitFor(() => {
        expect(screen.getByText('Please connect your wallet')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Flow', () => {
    it('should handle wallet connection', async () => {
      renderApp();

      const connectButton = screen.getByText('Connect Wallet');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('0x123')).toBeInTheDocument();
      });
    });

    it('should handle authentication errors', async () => {
      (window as any).ethereum.request = jest.fn().mockRejectedValue(new Error('User rejected'));
      renderApp();

      const connectButton = screen.getByText('Connect Wallet');
      fireEvent.click(connectButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to connect wallet')).toBeInTheDocument();
      });
    });
  });

  describe('Marketplace Integration', () => {
    it('should display and filter agents', async () => {
      renderApp();
      fireEvent.click(screen.getByText('Marketplace'));

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-card')).toHaveLength(mockAgentList.length);
      });

      // Test search
      const searchInput = screen.getByPlaceholderText('Search agents...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-card')).toHaveLength(1);
      });

      // Test category filter
      const categoryFilter = screen.getByTestId('category-filter');
      fireEvent.change(categoryFilter, { target: { value: 'AI' } });

      await waitFor(() => {
        const cards = screen.getAllByTestId('agent-card');
        cards.forEach(card => {
          expect(card).toHaveTextContent('AI');
        });
      });
    });

    it('should handle agent purchase flow', async () => {
      renderApp();
      fireEvent.click(screen.getByText('Marketplace'));

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-card')).toBeInTheDocument();
      });

      // Click buy button
      fireEvent.click(screen.getAllByText('Buy Now')[0]);

      // Verify purchase modal
      await waitFor(() => {
        expect(screen.getByTestId('purchase-modal')).toBeInTheDocument();
      });

      // Confirm purchase
      fireEvent.click(screen.getByText('Confirm Purchase'));

      await waitFor(() => {
        expect(screen.getByText('Purchase successful!')).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Integration', () => {
    it('should load and display metrics', async () => {
      renderApp();
      fireEvent.click(screen.getByText('Analytics'));

      await waitFor(() => {
        expect(screen.getByText(mockMetricsData.platform.totalAgents.toString())).toBeInTheDocument();
        expect(screen.getByText(mockMetricsData.platform.totalUsers.toString())).toBeInTheDocument();
      });

      // Test time frame change
      const timeFrameSelect = screen.getByTestId('timeframe-selector');
      fireEvent.change(timeFrameSelect, { target: { value: '7d' } });

      await waitFor(() => {
        expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should handle metrics loading errors', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Failed to load metrics'));

      renderApp();
      fireEvent.click(screen.getByText('Analytics'));

      await waitFor(() => {
        expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
      });

      // Test retry functionality
      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.queryByText('Error loading metrics')).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile Integration', () => {
    it('should display user profile and owned agents', async () => {
      renderApp();
      fireEvent.click(screen.getByText('Profile'));

      await waitFor(() => {
        expect(screen.getByText('0x123')).toBeInTheDocument();
        expect(screen.getByText('Owned Agents')).toBeInTheDocument();
      });
    });

    it('should handle agent management', async () => {
      renderApp();
      fireEvent.click(screen.getByText('Profile'));

      await waitFor(() => {
        expect(screen.getAllByTestId('agent-card')).toBeInTheDocument();
      });

      // Edit agent
      fireEvent.click(screen.getAllByText('Edit')[0]);

      await waitFor(() => {
        expect(screen.getByTestId('edit-modal')).toBeInTheDocument();
      });

      // Update agent name
      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Agent' } });

      // Save changes
      fireEvent.click(screen.getByText('Save Changes'));

      await waitFor(() => {
        expect(screen.getByText('Updated Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary', () => {
    it('should catch and display runtime errors', async () => {
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <BrowserRouter>
          <ErrorComponent />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should lazy load components', async () => {
      renderApp();

      // Navigate to analytics (lazy loaded)
      fireEvent.click(screen.getByText('Analytics'));

      await waitFor(() => {
        expect(screen.getByTestId('analytics-page')).toBeInTheDocument();
      });

      // Verify that the bundle was loaded
      const scripts = document.getElementsByTagName('script');
      const analyticsBundle = Array.from(scripts).find(script => 
        script.src.includes('analytics')
      );
      expect(analyticsBundle).toBeTruthy();
    });
  });
});
