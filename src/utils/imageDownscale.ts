/**
 * Downscales a user-supplied image to a max edge length and returns the
 * result as base64 + mimeType, ready to send as Gemini `inlineData`.
 *
 * Phone photos are typically 3-5 MB; for ingredient identification 1024px on
 * the long edge is plenty and keeps the round-trip snappy. Photos already
 * smaller than the limit are re-encoded as JPEG to strip metadata.
 */
export const downscaleImage = async (
  file: File,
  maxDim: number = 1024,
  quality: number = 0.85
): Promise<{ base64: string; mimeType: string }> => {
  // Use createObjectURL rather than FileReader.readAsDataURL: the latter allocates
  // a ~Nx1.33 base64 string of the original (potentially multi-MB) photo, which
  // is wasteful on memory-constrained mobile devices.
  const objectUrl = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`failed to decode image (type=${file.type || 'unknown'}, size=${file.size})`));
    el.src = objectUrl;
  }).finally(() => URL.revokeObjectURL(objectUrl));

  // iOS in standalone (home-screen) mode sometimes hands over a HEIC original
  // that decodes to zero dimensions; catch this explicitly so the caller can
  // distinguish a decode failure from a network/API failure.
  if (!img.width || !img.height) {
    throw new Error(`zero-dimension image (type=${file.type || 'unknown'}, size=${file.size})`);
  }

  const longEdge = Math.max(img.width, img.height);
  const scale = longEdge > maxDim ? maxDim / longEdge : 1;
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  const mimeType = 'image/jpeg';
  const encoded = canvas.toDataURL(mimeType, quality);
  const commaIdx = encoded.indexOf(',');
  // `toDataURL` can return `'data:,'` (empty payload) on iOS for HEIC-sourced
  // canvases; treat that as a decode failure instead of POSTing empty bytes.
  if (commaIdx < 0 || commaIdx === encoded.length - 1) {
    throw new Error(`empty data URL from canvas (type=${file.type || 'unknown'}, ${width}x${height})`);
  }
  const base64 = encoded.slice(commaIdx + 1);
  return { base64, mimeType };
};
