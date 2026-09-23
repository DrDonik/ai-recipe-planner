import { z } from 'zod';
import { deflateSync, inflateSync } from 'fflate';

/**
 * Caps against a crafted link that inflates to something huge. The payload cap
 * is what actually bounds memory (deflate tops out near 1000:1); the inflated
 * cap then holds the result to what a recipe could plausibly need. Both sit an
 * order of magnitude above a real recipe.
 */
const MAX_PAYLOAD_LENGTH = 16 * 1024;
const MAX_INFLATED_BYTES = 256 * 1024;

const toBinaryString = (bytes: Uint8Array): string =>
    Array.from(bytes, (byte) => String.fromCodePoint(byte)).join('');

const fromBinaryString = (binString: string): Uint8Array =>
    Uint8Array.from(binString, (char) => char.codePointAt(0)!);

/**
 * Encodes an object into a URL-safe string: UTF-8 JSON, raw-deflated, then
 * base64url without padding. base64url needs no percent-encoding, so the
 * result can go straight into `searchParams.set`.
 */
export const encodeForUrl = <T>(data: T): string => {
    const bytes = deflateSync(new TextEncoder().encode(JSON.stringify(data)), { level: 9 });
    return btoa(toBinaryString(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Turns the bytes `toBytes` produces into a validated object. Anything thrown
 * on the way, from the byte decoding through to the schema, yields null.
 */
const decodeWith = <T>(toBytes: () => Uint8Array, schema?: z.ZodSchema<T>): T | null => {
    try {
        const json = new TextDecoder().decode(toBytes());
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
 * Decodes a payload written by {@link encodeForUrl}.
 *
 * @param payload - The base64url string from the URL parameter
 * @param schema - Optional Zod schema for runtime validation
 * @returns Decoded and validated object, or null if decoding/validation fails
 */
export const decodeFromUrl = <T>(payload: string, schema?: z.ZodSchema<T>): T | null =>
    decodeWith(() => {
        if (payload.length > MAX_PAYLOAD_LENGTH) throw new Error('Shared payload exceeds the length cap');
        const compressed = fromBinaryString(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        // fflate stops silently at the end of a supplied buffer, so one byte of
        // headroom is what tells "exactly at the cap" from "past it".
        const inflated = inflateSync(compressed, { out: new Uint8Array(MAX_INFLATED_BYTES + 1) });
        if (inflated.length > MAX_INFLATED_BYTES) throw new Error('Shared payload inflates past the cap');
        return inflated;
    }, schema);

/**
 * Decodes a payload in the uncompressed format links were written in before:
 * percent-encoded base64 of UTF-8 JSON (the percent-encoding was applied on top
 * of the one `searchParams` adds, hence the extra decode).
 */
export const decodeLegacyFromUrl = <T>(param: string, schema?: z.ZodSchema<T>): T | null =>
    decodeWith(() => fromBinaryString(atob(decodeURIComponent(param))), schema);

/**
 * Generates a full share URL with a specific parameter.
 */
export const generateShareUrl = <T>(paramName: string, data: T): string => {
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set(paramName, encodeForUrl(data));
    return url.toString();
};
