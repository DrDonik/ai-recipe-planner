/**
 * Encodes an object into a Base64 string safe for URLs.
 */
export const encodeForUrl = <T>(data: T): string => {
    const json = JSON.stringify(data);
    // UTF-8 friendly base64 encoding
    return btoa(unescape(encodeURIComponent(json)));
};

/**
 * Decodes a Base64 string from a URL parameter back into an object.
 */
export const decodeFromUrl = <T>(base64: string): T | null => {
    try {
        const json = decodeURIComponent(escape(atob(base64)));
        return JSON.parse(json) as T;
    } catch (error) {
        console.error("Failed to decode shared data", error);
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
