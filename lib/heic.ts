// HEIC -> JPEG conversion utility
// Uses heic-convert (pure JS, works in Vercel serverless)
export async function convertToJpegIfHeic(
  buffer: Buffer,
  filename: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const lower = filename.toLowerCase();
  const isHeic = lower.endsWith(".heic") || lower.endsWith(".heif");
  if (!isHeic) {
    return { buffer, filename, contentType: lower.endsWith(".png") ? "image/png" : "image/jpeg" };
  }
  // Dynamic import to keep cold start fast for non-HEIC paths
  const heicConvert = (await import("heic-convert")).default;
  const jpegArrayBuffer = await heicConvert({
    buffer: buffer as any,
    format: "JPEG",
    quality: 0.85,
  });
  return {
    buffer: Buffer.from(jpegArrayBuffer),
    filename: filename.replace(/\.(heic|heif)$/i, ".jpg"),
    contentType: "image/jpeg",
  };
}
