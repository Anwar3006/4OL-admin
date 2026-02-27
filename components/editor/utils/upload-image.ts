import { supabase } from "@/lib/supabase";

export interface UploadImageResult {
  publicUrl: string;
  error?: Error;
}

/**
 * Uploads an image file to Supabase storage
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (default: 'media' or your main bucket)
 * @param path - The path within the bucket (default: 'richTextImages')
 * @returns Object with publicUrl or error
 */
export async function uploadImageToSupabase(
  file: File,
  bucket: string,
  path: string = "richTextImages",
): Promise<UploadImageResult> {
  try {
    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol";
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    // Construct full path: /richTextImages/filename.extension
    const fullPath = path ? `${path}/${fileName}` : fileName;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucketName).getPublicUrl(fullPath);

    return { publicUrl };
  } catch (error) {
    console.error("Image upload failed:", error);
    return {
      publicUrl: "",
      error: error instanceof Error ? error : new Error("Upload failed"),
    };
  }
}

/**
 * Uploads a blob/base64 image to Supabase storage
 * @param blob - The image blob to upload
 * @param filename - Original filename (used to get extension)
 * @param bucket - The storage bucket name (default: 'media' or your main bucket)
 * @param path - The path within the bucket (default: 'richTextImages')
 * @returns Object with publicUrl or error
 */
export async function uploadBlobToSupabase(
  blob: Blob,
  filename: string = "image.png",
  bucket: string = "bucket4ol",
  path: string = "richTextImages",
): Promise<UploadImageResult> {
  try {
    const bucketName = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || bucket;
    // Generate unique filename
    const fileExt = filename.split(".").pop() || "png";
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    // Construct full path: /richTextImages/filename.extension
    const fullPath = path ? `${path}/${fileName}` : fileName;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fullPath, blob);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fullPath);

    return { publicUrl };
  } catch (error) {
    console.error("Blob upload failed:", error);
    return {
      publicUrl: "",
      error: error instanceof Error ? error : new Error("Upload failed"),
    };
  }
}
