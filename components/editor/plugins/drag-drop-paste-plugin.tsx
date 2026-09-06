"use client";

import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { isMimeType } from "@lexical/utils";
import { COMMAND_PRIORITY_LOW } from "lexical";

import { INSERT_IMAGE_COMMAND } from "@/components/editor/plugins/images-plugin";
import {
  useGetPresignedUploadUrl,
  useUploadToSupabase,
} from "@/lib/media-storage";
import { nanoid } from "nanoid";
import { supabase } from "@/lib/supabase"; // Ensure supabase client is available for public URL generation

const ACCEPTABLE_IMAGE_TYPES = [
  "image/",
  "image/heic",
  "image/heif",
  "image/gif",
  "image/webp",
];

export function DragDropPastePlugin(): null {
  const [editor] = useLexicalComposerContext();

  const getPresignedUrlMutation = useGetPresignedUploadUrl();
  const uploader = useUploadToSupabase();

  useEffect(() => {
    return editor.registerCommand(
      DRAG_DROP_PASTE,
      (files) => {
        const hasImage = files.some((file) =>
          isMimeType(file, ACCEPTABLE_IMAGE_TYPES),
        );
        if (!hasImage) {
          return false;
        }

        // We use a self-invoking async function to process the files
        (async () => {
          for (const file of files) {
            if (isMimeType(file, ACCEPTABLE_IMAGE_TYPES)) {
              try {
                // Step 1: Generate a unique file path
                const fileKey = `richTextImages/${nanoid(6)}-${file.name.replace(/\s+/g, "_")}`;

                // Step 2: Get presigned URL from your server action hook
                const { signedUrl, path } =
                  await getPresignedUrlMutation.mutateAsync(fileKey);

                // Step 3: Perform the actual upload to Supabase Storage
                // Note: token is usually handled by the signedUrl itself or headers in your hook
                await uploader.mutateAsync({
                  file,
                  signedUrl,
                  token: "", // Passing empty string if handled by the URL, or adjust hook if needed
                });

                // Step 4: Construct the Public URL
                // Since it's a public bucket, we get the URL via the path
                const {
                  data: { publicUrl },
                } = supabase.storage
                  .from(
                    process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME || "bucket4ol",
                  )
                  .getPublicUrl(path);

                // Step 5: Insert into Lexical Editor
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, {
                  altText: file.name,
                  src: publicUrl,
                });
              } catch (error) {
                console.error("DragDrop upload failed:", error);
                // Errors are already toasted in your hooks, so we just continue
                continue;
              }
            }
          }
        })();

        // Prevent default browser drop behavior
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, getPresignedUrlMutation, uploader]);

  return null;
}
