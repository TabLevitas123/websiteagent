import { render, screen, fireEvent } from '@testing-library/react';
import { DiagnosticsDashboard } from './diagnostics-dashboard';
import { usePerformanceMetrics } from '@/hooks/use-performance-metrics';

jest.mock('@/hooks/use-performance-metrics');

describe('DiagnosticsDashboard Mobile Tests', () => {
  beforeEach(() => {
    // Mock mobile device
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      configurable: true
    });
  });

  it('renders in mobile layout', () => {
    (usePerformanceMetrics as jest.Mock).mockReturnValue({
      metrics: {},
      stats: {
        memory: { current: 50, status: 'normal' },
        cpu: { current: 30, status: 'normal' },
        fps: { current: 60, status: 'normal' },
        latency: { current: 100, status: 'normal' }
      }
    });

    render(<DiagnosticsDashboard />);
    expect(screen.getByText('System Diagnostics')).toBeInTheDocument();
  });

  it('handles mobile gestures correctly', () => {
    (usePerformanceMetrics as jest.Mock).mockReturnValue({
      metrics: {},
      stats: {
        memory: { current: 50, status: 'normal' }
      }
    });

    render(<DiagnosticsDashboard />);
    const card = screen.getByText('Memory Usage').closest('div');
    fireEvent.touchStart(card);
  });
});
