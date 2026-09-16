import { gunzipSync, inflateSync, brotliDecompressSync } from 'zlib';

export async function decompressResponse(
  buffer: Buffer,
  contentEncoding: string | null,
): Promise<Buffer> {
  if (!contentEncoding) return buffer;

  const encoding = contentEncoding.toLowerCase().trim();

  try {
    if (encoding === 'gzip' || encoding === 'x-gzip') {
      return gunzipSync(buffer);
    }
    if (encoding === 'deflate') {
      return inflateSync(buffer);
    }
    if (encoding === 'br') {
      return brotliDecompressSync(buffer);
    }
  } catch {
    return buffer;
  }

  return buffer;
}
