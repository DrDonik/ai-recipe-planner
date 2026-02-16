import { useEffect, useRef } from 'react';

/**
 * Custom hook that implements focus trap for dialogs and modals.
 *
 * Features:
 * - Stores and restores focus to the previously focused element
 * - Focuses the first focusable element on mount
 * - Traps focus within the dialog (cycles between first and last focusable elements)
 * - Handles Escape key to close the dialog
 *
 * @param onClose - Callback to close the dialog (called on Escape key)
 * @returns ref - Ref to attach to the dialog container element
 */
export function useFocusTrap(onClose: () => void) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);

    // Keep the ref up to date without re-running the effect
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        // Store the currently focused element
        previousFocusRef.current = document.activeElement as HTMLElement;

        // Get all focusable elements within the dialog
        const getFocusableElements = (): HTMLElement[] => {
            if (!dialogRef.current) return [];

            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
            ].join(',');

            return Array.from(
                dialogRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
            );
        };

        // Focus the first focusable element, unless something inside already has focus (e.g., autoFocus)
        const focusableElements = getFocusableElements();
        const isAlreadyFocusedInside = dialogRef.current?.contains(document.activeElement);

        if (!isAlreadyFocusedInside) {
            if (focusableElements.length > 0) {
                focusableElements[0].focus();
            } else {
                // If no focusable elements, focus the dialog itself
                dialogRef.current?.focus();
            }
        }

        // Handle keyboard events
        const handleKeyDown = (e: KeyboardEvent) => {
            // Close on Escape
            if (e.key === 'Escape') {
                onCloseRef.current();
                return;
            }

            // Trap focus on Tab - handle ALL Tab presses manually to ensure focus stays in dialog
            if (e.key === 'Tab') {
                e.preventDefault();

                const focusableElements = getFocusableElements();
                if (focusableElements.length === 0) return;

                const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

                let nextIndex: number;
                if (e.shiftKey) {
                    // Shift + Tab: moving backwards
                    nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
                } else {
                    // Tab: moving forwards
                    nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1;
                }

                focusableElements[nextIndex].focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Cleanup: restore focus to the previously focused element
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocusRef.current?.focus();
        };
    }, []); // Empty dependency array - effect runs only once on mount

    return dialogRef;
}
