import { put } from "@vercel/blob";

export async function uploadToStorage(filename: string, buffer: Buffer, contentType = "image/jpeg"): Promise<string> {
  const blob = await put(filename, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
