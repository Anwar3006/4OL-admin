import {
  deleteFile,
  getPresignedUploadUrl,
  getSignedUrl,
} from "@/actions/media-storage.actions";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * Hook to get presigned upload URL from Supabase
 * Uses server action with admin client (bypasses RLS)
 */
export const useGetPresignedUploadUrl = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      const result = await getPresignedUploadUrl(filePath);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data!;
    },
    onError: (error: Error) => {
      toast.error(`Failed to get upload URL: ${error.message}`);
    },
  });
};

/**
 * Hook to upload file to Supabase using presigned URL
 * Handles the actual file upload with progress tracking
 */
export const useUploadToSupabase = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      signedUrl,
      token,
    }: {
      file: File;
      signedUrl: string;
      token: string;
    }) => {
      // Upload to the signed URL
      const response = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
          "x-upsert": "true", // Overwrite if exists
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Upload failed with status ${response.status}: ${errorText}`,
        );
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["media-storage"],
      });
      toast.success("File uploaded successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload file: ${error.message}`);
    },
  });
};

/**
 * Hook to delete a file from Supabase Storage
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filePath: string) => {
      const result = await deleteFile(filePath);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["media-storage"],
      });
      toast.success("File deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });
};

/**
 * Hook to get signed URL for private files
 * Use for temporary access to private files
 */
// export const useGetSignedUrls = (
//   filePaths: string[] | undefined,
//   enabled: boolean
// ) => {
//   return useQuery({
//     queryKey: ["signed-urls", filePaths],
//     queryFn: async () => {
//       if (!filePaths || filePaths.length === 0) return [];

//       const signedUrls = await Promise.all(
//         filePaths.map(async (path) => {
//           const result = await getSignedUrl(path); // Your server action
//           if (!result.success) throw new Error(result.error);
//           return {
//             url: result.data!.signedUrl,
//             path: path,
//           };
//         })
//       );
//       return signedUrls;
//     },
//     enabled: enabled && !!filePaths && filePaths.length > 0,
//     staleTime: 1000 * 60 * 50, // 50 minutes (slightly less than 1hr expiry)
//   });
// };
