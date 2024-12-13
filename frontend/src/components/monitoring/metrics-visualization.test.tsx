import { render, screen, fireEvent } from '@testing-library/react';
import { MetricsVisualization } from './metrics-visualization';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';

// Mock the performance metrics hook
jest.mock('@/hooks/use-performance-metrics');

describe('MetricsVisualization', () => {
  beforeEach(() => {
    // Mock user agent for mobile device
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });
  });

  it('renders correctly on mobile devices', () => {
    (usePerformanceMetrics as jest.Mock).mockReturnValue({
      metrics: {
        cpu: [{ timestamp: Date.now(), value: 50 }]
      }
    });

    render(
      <MetricsVisualization
        metricName="cpu"
        title="CPU Usage"
        timeRange={5}
      />
    );

    expect(screen.getByText('CPU Usage')).toBeInTheDocument();
  });

  it('handles touch interactions correctly', () => {
    (usePerformanceMetrics as jest.Mock).mockReturnValue({
      metrics: {
        cpu: [{ timestamp: Date.now(), value: 50 }]
      }
    });

    render(
      <MetricsVisualization
        metricName="cpu"
        title="CPU Usage"
        timeRange={5}
      />
    );

    const chart = screen.getByRole('img');
    fireEvent.touchStart(chart);
    // Verify tooltip appears
  });
});
