import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Number of dialogs currently mounted, and a subscription to it.
 *
 * Every dialog in the app — and nothing else — calls `useFocusTrap`, so the
 * hook is the honest place to keep this. A dialog is a `fixed inset-0 z-[60]`
 * backdrop with `aria-modal="true"`, which puts anything rendered in the
 * document flow behind it both visually and in the accessibility tree.
 * `App` uses the signal to hold a background notification until the last
 * dialog closes, rather than letting it expire unseen behind one.
 */
let openModalCount = 0;
const modalListeners = new Set<() => void>();
const emitModalCount = () => { modalListeners.forEach(listener => listener()); };

export const subscribeModalCount = (listener: () => void) => {
    modalListeners.add(listener);
    return () => { modalListeners.delete(listener); };
};

/** Current count, readable outside React — see `showNotification` in `App`. */
export const getModalCount = () => openModalCount;

/** Subscribed form of the same fact, for effects that react to it. */
export const useModalOpen = () =>
    useSyncExternalStore(subscribeModalCount, () => openModalCount > 0, () => false);

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
 * @param focusContainer - Focus the dialog itself instead of its first control.
 *   Use this where no button is a safe default: the emphasised button is then
 *   not the one Enter would trigger, so Enter is left doing nothing.
 * @returns ref - Ref to attach to the dialog container element
 */
export function useFocusTrap(onClose: () => void, focusContainer = false) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const onCloseRef = useRef(onClose);
    // Read once on mount, like onCloseRef, so the effect stays dependency-free
    const focusContainerRef = useRef(focusContainer);

    // Keep the ref up to date without re-running the effect
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        // Paired with the decrement in this effect's cleanup, so StrictMode's
        // double mount in dev nets out to the same count.
        openModalCount++;
        emitModalCount();

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
            if (focusContainerRef.current) {
                dialogRef.current?.focus();
            } else if (focusableElements.length > 0) {
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
            openModalCount--;
            emitModalCount();
        };
    }, []); // Empty dependency array - effect runs only once on mount

    return dialogRef;
}
