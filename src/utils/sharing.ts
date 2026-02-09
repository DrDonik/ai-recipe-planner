import { z } from 'zod';

/**
 * Encodes an object into a Base64 string safe for URLs.
 * Uses TextEncoder for proper UTF-8 handling (replaces deprecated unescape/escape).
 */
export const encodeForUrl = <T>(data: T): string => {
    const json = JSON.stringify(data);
    const bytes = new TextEncoder().encode(json);
    const binString = Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');
    return btoa(binString);
};

/**
 * Decodes a Base64 string from a URL parameter back into an object.
 * Uses TextDecoder for proper UTF-8 handling (replaces deprecated unescape/escape).
 *
 * @param base64 - The base64 encoded string from URL parameter
 * @param schema - Optional Zod schema for runtime validation
 * @returns Decoded and validated object, or null if decoding/validation fails
 */
export const decodeFromUrl = <T>(base64: string, schema?: z.ZodSchema<T>): T | null => {
    try {
        const binString = atob(base64);
        const bytes = Uint8Array.from(binString, (char) => char.codePointAt(0)!);
        const json = new TextDecoder().decode(bytes);
        const parsed = JSON.parse(json);

        // If a schema is provided, validate the parsed data
        if (schema) {
            const validated = schema.parse(parsed);
            return validated;
        }

        // Fallback to unvalidated parsing (for backwards compatibility)
        return parsed as T;
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Validation failed for shared data:", error.issues);
        } else {
            console.error("Failed to decode shared data:", error);
        }
        return null;
    }
};

/**
 * Generates a full share URL with a specific parameter.
 */
export const generateShareUrl = <T>(paramName: string, data: T): string => {
    const encoded = encodeForUrl(data);
    const url = new URL(window.location.origin + window.location.pathname);
    // encodeURIComponent because base64 can contain '+' which URLSearchParams treats as space
    url.searchParams.set(paramName, encodeURIComponent(encoded));
    return url.toString();
};
