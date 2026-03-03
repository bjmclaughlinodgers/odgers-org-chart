import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary — catches render errors and displays them
 * instead of crashing the entire app to a white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      const label = this.props.fallbackLabel ?? 'Application';

      return (
        <div className="p-6 max-w-2xl mx-auto my-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 dark:text-red-400 text-lg font-bold">!</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                  {label} Error
                </h3>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  Something went wrong rendering this section.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-white dark:bg-[#0f1419] rounded-lg p-3 border border-red-100 dark:border-red-800/30">
                <p className="text-xs font-mono text-red-700 dark:text-red-300 break-all">
                  {error.name}: {error.message}
                </p>
              </div>
            )}

            {errorInfo?.componentStack && (
              <details className="text-xs">
                <summary className="text-red-500 dark:text-red-400 cursor-pointer font-semibold hover:underline">
                  Component Stack
                </summary>
                <pre className="mt-2 p-3 bg-white dark:bg-[#0f1419] rounded-lg border border-red-100 dark:border-red-800/30 text-red-600 dark:text-red-400 overflow-auto max-h-48 font-mono text-[10px] leading-relaxed whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 px-4 py-2 rounded-lg transition-colors duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
