/**
 * Generates a unique ID using the Web Crypto API.
 * This is available in all modern browsers over HTTPS.
 */
export function generateId(): string {
    return crypto.randomUUID();
}
