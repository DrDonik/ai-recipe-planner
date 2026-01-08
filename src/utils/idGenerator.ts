/**
 * Generates a unique ID.
 * Tries to use crypto.randomUUID() if available (secure context),
 * otherwise falls back to a timestamp + random string combination.
 */
export function generateId(): string {
    // Check if crypto.randomUUID is available
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Fallback for non-secure contexts (like HTTP on LAN) where crypto.randomUUID might be missing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
