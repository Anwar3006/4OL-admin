import { getPresignedUploadUrl } from "@/actions/media-storage.actions";

export interface UploadImageResult {
  publicUrl: string;
  error?: Error;
}

/**
 * Uploads an image file to Supabase storage using a presigned URL
 * This bypasses client-side RLS by using a server action with an admin client
 * @param file - The image file to upload
 * @param bucket - The storage bucket name (optional, uses env default)
 * @param path - The path within the bucket (default: 'richTextImages')
 * @returns Object with publicUrl or error
 */
export async function uploadImageToSupabase(
  file: File,
  bucket?: string,
  path: string = "richTextImages",
): Promise<UploadImageResult> {
  try {
    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol";
    
    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;

    // Construct full path
    const fullPath = path ? `${path}/${fileName}` : fileName;

    // Step 1: Get presigned URL from server action
    const result = await getPresignedUploadUrl(fullPath);

    if (!result.success) {
      throw new Error(result.error);
    }

    const { signedUrl } = result.data!;

    // Step 2: Upload to the signed URL using PUT
    const response = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "x-upsert": "true",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
    }

    // Step 3: Construct the public URL
    // We assume the bucket is public or we construct the standard Supabase public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fullPath}`;

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
 */
export async function uploadBlobToSupabase(
  blob: Blob,
  filename: string = "image.png",
  bucket: string = "bucket4ol",
  path: string = "richTextImages",
): Promise<UploadImageResult> {
  try {
    // Convert blob to File if needed or just use blob
    const file = new File([blob], filename, { type: blob.type });
    return await uploadImageToSupabase(file, bucket, path);
  } catch (error) {
    console.error("Blob upload failed:", error);
    return {
      publicUrl: "",
      error: error instanceof Error ? error : new Error("Upload failed"),
    };
  }
}

