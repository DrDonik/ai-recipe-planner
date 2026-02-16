import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-bg-app flex items-center justify-center p-8">
                    <div className="glass-panel p-8 max-w-md w-full text-center">
                        <div className="bg-red-500/10 p-4 rounded-full w-fit mx-auto mb-4">
                            <AlertTriangle size={48} className="text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                        <p className="text-text-muted mb-6">
                            An unexpected error occurred. Please try refreshing the page.
                        </p>
                        {this.state.error && (
                            <details className="text-left mb-6 bg-black/5 dark:bg-white/5 p-4 rounded-lg">
                                <summary className="cursor-pointer text-sm font-medium text-text-muted">
                                    Error details
                                </summary>
                                <div className="mt-2 text-xs overflow-auto text-red-600 dark:text-red-400 space-y-2">
                                    <div>
                                        <strong>Message:</strong>
                                        <pre className="mt-1">{this.state.error.message}</pre>
                                    </div>
                                    {this.state.error.stack && (
                                        <div>
                                            <strong>Stack:</strong>
                                            <pre className="mt-1">{this.state.error.stack}</pre>
                                        </div>
                                    )}
                                    {this.state.errorInfo?.componentStack && (
                                        <div>
                                            <strong>Component Stack:</strong>
                                            <pre className="mt-1">{this.state.errorInfo.componentStack}</pre>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )}
                        <button
                            onClick={this.handleReset}
                            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Try Again
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
