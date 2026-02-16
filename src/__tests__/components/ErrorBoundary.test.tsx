import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Test error message');
    }
    return <div>No error</div>;
};

describe('ErrorBoundary', () => {
    // Suppress console.error for these tests
    const originalError = console.error;
    beforeAll(() => {
        console.error = vi.fn();
    });

    afterAll(() => {
        console.error = originalError;
    });

    it('renders children when there is no error', () => {
        render(
            <ErrorBoundary>
                <div>Test content</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('renders error UI when child component throws', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
        expect(screen.getByText('An unexpected error occurred. Please try refreshing the page.')).toBeInTheDocument();
    });

    it('displays error message in details section', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Open details section
        const details = screen.getByText('Error details');
        details.click();

        expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('displays error stack when available', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Open details section
        const details = screen.getByText('Error details');
        details.click();

        // Check for stack label
        expect(screen.getByText('Stack:')).toBeInTheDocument();
    });

    it('displays component stack when available', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Open details section
        const details = screen.getByText('Error details');
        details.click();

        // Check for component stack label
        expect(screen.getByText('Component Stack:')).toBeInTheDocument();
    });

    it('has a Try Again button that resets the error state', async () => {
        const user = userEvent.setup();

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Error UI should be visible
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();

        // Try Again button should be present
        const button = screen.getByRole('button', { name: /try again/i });
        expect(button).toBeInTheDocument();

        // Click Try Again button should not throw
        await user.click(button);
    });

    it('renders custom fallback when provided', () => {
        const fallback = <div>Custom error fallback</div>;

        render(
            <ErrorBoundary fallback={fallback}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
        expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('logs error and errorInfo to console', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error');

        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
            'ErrorBoundary caught an error:',
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String)
            })
        );
    });
});
