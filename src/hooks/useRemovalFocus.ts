import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps the keyboard somewhere sensible after a list entry is removed.
 *
 * Removing an entry unmounts the button that was just pressed, and the browser
 * drops focus on <body>. The keyboard then has no place in the document, so
 * deleting a second entry means travelling back down from the top — which is
 * what makes a long list expensive to prune (Rule 6: a deletion the keyboard
 * cannot recover from is worse than a slow one).
 *
 * Call the returned function with the index being removed, in the same handler
 * that removes it. The effect runs on the next change to `count`, by which
 * point the list has re-rendered: focus goes to whatever now sits at that
 * index, to the new last entry if the removed one was last, or to
 * `fallbackRef` when nothing is left.
 *
 * A pending index is always consumed by the next length change, and acted on
 * only when the list actually got shorter — so a removal that turns out to be
 * a no-op cannot strand a stale index and steal focus from a later addition.
 */
export const useRemovalFocus = (
    listRef: React.RefObject<HTMLElement | null>,
    fallbackRef: React.RefObject<HTMLElement | null>,
    selector: string,
    count: number,
) => {
    const pendingIndexRef = useRef<number | null>(null);
    const previousCountRef = useRef(count);

    useEffect(() => {
        const shrank = count < previousCountRef.current;
        previousCountRef.current = count;
        const index = pendingIndexRef.current;
        pendingIndexRef.current = null;
        if (index === null || !shrank) return;

        const targets = listRef.current?.querySelectorAll<HTMLElement>(selector);
        if (!targets || targets.length === 0) {
            fallbackRef.current?.focus();
            return;
        }
        targets[Math.min(index, targets.length - 1)]?.focus();
    }, [count, listRef, fallbackRef, selector]);

    return useCallback((index: number) => {
        pendingIndexRef.current = index;
    }, []);
};
