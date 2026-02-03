import { createAdminClient } from '../supabase/server';
import { nanoid } from 'nanoid';

const BUCKET_NAME = 'drops';

export interface UploadResult {
  key: string;
  url: string;
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImage(
  buffer: Buffer,
  contentType: string,
  folder: 'drops' | 'thumbnails' | 'fullres' | 'avatars' = 'drops'
): Promise<UploadResult> {
  const supabase = createAdminClient();
  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const key = `${folder}/${nanoid()}.${extension}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, buffer, {
      contentType,
      cacheControl: '31536000', // 1 year
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(key);

  return {
    key,
    url: urlData.publicUrl,
  };
}

/**
 * Upload a base64-encoded image
 */
export async function uploadBase64Image(
  base64Data: string,
  folder: 'drops' | 'thumbnails' | 'fullres' | 'avatars' = 'drops'
): Promise<UploadResult> {
  // Remove data URL prefix if present
  const base64Clean = base64Data.replace(/^data:image\/[\w+]+;base64,/, '');

  // Detect content type from data URL or default to PNG
  let contentType = 'image/png';
  const match = base64Data.match(/^data:(image\/[\w+]+);base64,/);
  if (match) {
    contentType = match[1];
  }

  const buffer = Buffer.from(base64Clean, 'base64');
  return uploadImage(buffer, contentType, folder);
}

/**
 * Delete an image from storage
 */
export async function deleteImage(key: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([key]);

  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

/**
 * Get public URL for a key
 */
export function getPublicUrl(key: string): string {
  // This constructs the URL without making an API call
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
}
