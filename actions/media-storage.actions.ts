"use server";

import { getServerClient } from "@/lib/db/server";
import { getAdminClient } from "@/lib/db/admin";

type ManagedMediaBucket = "bucket4ol" | "provider-media";

const getMediaBucket = (requested?: string): ManagedMediaBucket =>
  requested === "provider-media"
    ? "provider-media"
    : "bucket4ol";

/**
 * Get presigned upload URL from Supabase Storage
 * Requires authentication
 */
export async function getPresignedUploadUrl(filePath: string, bucket?: ManagedMediaBucket) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to upload files",
      };
    }

    const bucketName = getMediaBucket(bucket);

    const supabaseAdmin = getAdminClient();

    // Create signed upload URL using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("Supabase upload URL error:", error);
      return {
        success: false,
        error: error.message || "Failed to create upload URL",
      };
    }

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        token: data.token,
        path: data.path,
      },
    };
  } catch (error) {
    console.error("Server action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Upload file to Supabase Storage using signed URL
 * This is called after getting the presigned URL
 */
export async function uploadToSignedUrl(
  signedUrl: string,
  token: string,
  file: File,
) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to upload files",
      };
    }

    // Note: The actual file upload happens on the client
    // This action just validates the session
    return {
      success: true,
      data: { signedUrl, token },
    };
  } catch (error) {
    console.error("Upload validation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Delete a file from Supabase Storage
 * Requires authentication
 */
export async function deleteFile(filePath: string, bucket?: ManagedMediaBucket) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to delete files",
      };
    }

    const bucketName = getMediaBucket(bucket);

    const supabaseAdmin = getAdminClient();

    // Delete file using admin client (bypasses RLS)
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error("Supabase delete error:", error);
      return {
        success: false,
        error: error.message || "Failed to delete file",
      };
    }

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("Delete action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Delete multiple files from Supabase Storage
 * Requires authentication
 */
export async function deleteFiles(filePaths: string[], bucket?: ManagedMediaBucket) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to delete files",
      };
    }

    if (!filePaths || filePaths.length === 0) {
      return { success: true, message: "No files to delete." };
    }

    const bucketName = getMediaBucket(bucket);

    const supabaseAdmin = getAdminClient();

    // Delete files using admin client
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove(filePaths);

    if (error) {
      console.error("Supabase batch delete error:", error);
      return {
        success: false,
        error: error.message || "Failed to delete files",
      };
    }

    return {
      success: true,
      message: "Files deleted successfully",
    };
  } catch (error) {
    console.error("Delete files action error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get signed URL for downloading/viewing private files
 * Requires authentication
 */
export async function getSignedUrl(filePath: string, expiresIn = 3600) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to access files",
      };
    }

    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol";

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error("Supabase signed URL error:", error);
      return {
        success: false,
        error: error.message || "Failed to create signed URL",
      };
    }

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
      },
    };
  } catch (error) {
    console.error("Get signed URL error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

//move a one or more files from one folder to another
export async function moveFile(filePath: string, newFolder: string) {
  try {
    // Verify user is authenticated
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "Unauthorized: You must be logged in to move files",
      };
    }

    const bucketName =
      process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol";

    const supabaseAdmin = getAdminClient();

    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .move(filePath, newFolder);

    if (error) {
      console.error("Supabase move error:", error);
      return {
        success: false,
        error: error.message || "Failed to move file",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("Move file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
