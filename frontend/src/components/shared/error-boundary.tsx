import React, { Component, ErrorInfo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertTriangle,
  RefreshCw,
  Terminal,
  Bug,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetCondition?: any;
}

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isRecovering: boolean;
  errorCount: number;
  lastError: number | null;
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      error: null,
      errorInfo: null,
      isRecovering: false,
      errorCount: 0,
      lastError: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1,
      lastError: Date.now()
    }));

    // Log error
    logger.error('React Error Boundary caught an error:', {
      error,
      componentStack: errorInfo.componentStack,
      errorCount: this.state.errorCount + 1
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to monitoring service
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state if resetCondition changes
    if (this.props.resetCondition !== prevProps.resetCondition) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      await fetch('/api/log-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
          errorCount: this.state.errorCount,
          isMobile,
          networkType: (navigator as any).connection?.type || 'unknown'
        })
      });
    } catch (err) {
      logger.error('Failed to report error:', err);
    }
  }

  private resetErrorBoundary = () => {
    this.setState({
      error: null,
      errorInfo: null,
      isRecovering: true
    });

    // Add small delay to show recovery state
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ isRecovering: false });
    }, 1000);

    // Add small delay to show recovery state
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ isRecovering: false });
    }, 1000);
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleGoBack = () => {
    window.history.back();
  };

  render() {
    const { error, errorInfo, isRecovering, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (isRecovering) {
      return (
        <div className="flex items-center justify-center h-full">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">Recovering...</p>
          </motion.div>
        </div>
      );
    }

    if (error) {
      if (fallback) {
        return fallback;
      }

      return (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="container max-w-2xl mx-auto p-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  An Error Occurred
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    {error.message}
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="details">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Technical Details
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="p-4 bg-secondary rounded-lg font-mono text-sm">
                          <p className="mb-2">Error: {error.name}</p>
                          <p className="mb-2">Message: {error.message}</p>
                          {errorInfo && (
                            <p className="whitespace-pre-wrap">
                              Component Stack:{'\n'}
                              {errorInfo.componentStack}
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="debug">
                      <AccordionTrigger className="flex items-center gap-2">
                        <Bug className="w-4 h-4" />
                        Debug Information
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          <p>Error Count: {errorCount}</p>
                          <p>
                            Last Error:{' '}
                            {this.state.lastError
                              ? new Date(this.state.lastError).toLocaleString()
                              : 'N/A'}
                          </p>
                          <p>URL: {window.location.href}</p>
                          <p>User Agent: {navigator.userAgent}</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    variant="default"
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={this.handleGoBack}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Go Back
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      );
    }

    return children;
  }
}

export default ErrorBoundary;