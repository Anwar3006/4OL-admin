"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { FileRejection, useDropzone } from "react-dropzone";
import { Card, CardContent } from "./ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Camera,
  Film,
  ImageIcon,
  X,
} from "lucide-react";
import {
  useGetPresignedUploadUrl,
  useDeleteFile,
} from "@/hooks/supabase-calls/useMediaStorage";
import imageCompression from "browser-image-compression";

// ─── Allowed image extensions and their MIME types ───────────────────────────
// Only these formats are accepted when mediaType === "image" or "any".
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"] as const;
type AllowedImageExt = (typeof ALLOWED_IMAGE_EXTENSIONS)[number];

const IMAGE_MIME_MAP: Record<AllowedImageExt, string> = {
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".gif":  "image/gif",
};

// Default limits — callers can override via props
const DEFAULT_IMAGE_MAX_MB = 10;  // 10 MB per image after compression
const DEFAULT_VIDEO_MAX_MB = 50;  // 50 MB per video (unchanged)

// ─── Types ────────────────────────────────────────────────────────────────────

type MediaType = "image" | "video" | "any";

type ImageDropZoneProps = {
  text: string;
  filePath: string;
  onFilesChange?: (keys: string[]) => void;
  initialFiles?: string[];
  /**
   * "image"  – only photos/images accepted
   * "video"  – only video files accepted
   * "any"    – images AND videos accepted (the new mixed mode)
   */
  mediaType?: MediaType;
  maxFiles?: number;
  /**
   * Maximum image size in MB (post-compression).
   * Images larger than this after compression are rejected.
   * Default: 10 MB.
   */
  maxImageMB?: number;
  /**
   * Maximum video size in MB. Default: 50 MB.
   */
  maxVideoMB?: number;
  /**
   * Restrict accepted image extensions.
   * Subset of: ".jpg" | ".jpeg" | ".png" | ".webp" | ".gif"
   * If omitted, all five are accepted.
   */
  allowedImageExtensions?: AllowedImageExt[];
};

interface FileState {
  id: string;
  file: File;
  uploading: boolean;
  progress: number;
  key?: string;
  isDeleting: boolean;
  error: boolean;
  objectUrl?: string;
  fileCategory: "image" | "video";  // used to render the right preview element
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

/** Utility to check if a path or filename is a video based on extension */
export function isMediaVideo(path: string | undefined | null): boolean {
  if (!path) return false;
  const ext = path.split(".").pop()?.toLowerCase();
  return ["mp4", "mov", "webm"].includes(ext || "");
}

/** Human-readable size string, e.g. "3.4 MB" */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Returns the accepted MIME types object expected by react-dropzone based on
 * the mediaType prop and the optional allowedImageExtensions restriction.
 */
function buildAcceptMap(
  mediaType: MediaType,
  allowedImageExtensions: AllowedImageExt[],
): Record<string, string[]> {
  const imageExts = allowedImageExtensions.length > 0
    ? allowedImageExtensions
    : ALLOWED_IMAGE_EXTENSIONS.slice();

  // Build { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], ... }
  const imageAccept: Record<string, string[]> = {};
  for (const ext of imageExts) {
    const mime = IMAGE_MIME_MAP[ext];
    if (!imageAccept[mime]) imageAccept[mime] = [];
    if (!imageAccept[mime].includes(ext)) imageAccept[mime].push(ext);
  }

  if (mediaType === "video") return { "video/*": [] };
  if (mediaType === "image") return imageAccept;
  // "any" — accept both
  return { ...imageAccept, "video/*": [] };
}

// ─── Component ────────────────────────────────────────────────────────────────

const ImageDropZone = ({
  text,
  onFilesChange,
  filePath,
  initialFiles,
  mediaType = "any",
  maxFiles = 6,
  maxImageMB = DEFAULT_IMAGE_MAX_MB,
  maxVideoMB = DEFAULT_VIDEO_MAX_MB,
  allowedImageExtensions = [...ALLOWED_IMAGE_EXTENSIONS],
}: ImageDropZoneProps) => {
  const [files, setFiles] = useState<FileState[]>([]);
  const [fileIdToDelete, setFileIdToDelete] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        // Only revoke if it's a blob/object URL (starts with blob:)
        if (f.objectUrl?.startsWith("blob:")) URL.revokeObjectURL(f.objectUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync initialFiles into local state
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      const existingKeys = new Set(files.map((f) => f.key));
      const newInitialFiles = initialFiles.filter(
        (key) => key && !existingKeys.has(key),
      );

      if (newInitialFiles.length > 0) {
        const initialStates: FileState[] = newInitialFiles.map((key) => ({
          id: nanoid(6),
          // Create a mock file object for consistency
          file: { name: key.split("/").pop() || "Existing File" } as File,
          uploading: false,
          progress: 100,
          isDeleting: false,
          error: false,
          objectUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${key}`,
          key,
          fileCategory: isMediaVideo(key) ? "video" : "image",
        }));

        setFiles((prev) => [...prev, ...initialStates]);
      }
    }
    // Only run on initialFiles change to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  const getPresignedUrlMutation = useGetPresignedUploadUrl();
  const deleteFileMutation = useDeleteFile();

  const notifyParent = useCallback(
    (updatedFiles: FileState[]) => {
      if (onFilesChange) {
        const successfulKeys = updatedFiles
          .filter((f) => f.key && !f.error)
          .map((f) => f.key!);
        queueMicrotask(() => onFilesChange(successfulKeys));
      }
    },
    [onFilesChange],
  );

  // ── Per-file pre-upload validation ─────────────────────────────────────────
  const validateFile = useCallback(
    (file: File): string | null => {
      if (isImageFile(file)) {
        // Check extension is in the allowed list
        const ext = ("." + file.name.split(".").pop()?.toLowerCase()) as AllowedImageExt;
        if (!allowedImageExtensions.includes(ext)) {
          return `"${ext}" is not allowed. Accepted: ${allowedImageExtensions.join(", ")}`;
        }
        // Check raw (pre-compression) size — reject if more than 2× the limit
        // to avoid hanging the browser on enormous files before compression runs
        if (file.size > maxImageMB * 1024 * 1024 * 2) {
          return `Image is too large (${formatBytes(file.size)}). Max: ${maxImageMB * 2} MB before compression.`;
        }
      } else if (isVideoFile(file)) {
        if (file.size > maxVideoMB * 1024 * 1024) {
          return `Video is too large (${formatBytes(file.size)}). Max: ${maxVideoMB} MB.`;
        }
      }
      return null;
    },
    [allowedImageExtensions, maxImageMB, maxVideoMB],
  );

  // ── Upload a single file ────────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (originalFile: File) => {
      // Pre-upload validation
      const validationError = validateFile(originalFile);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const fileId = nanoid(6);
      const sanitizedFileName = originalFile.name.replace(/\s/g, "_");
      let file = originalFile;
      const fileKey = `${filePath}/${nanoid(4)}-${sanitizedFileName}`;
      const fileCategory: "image" | "video" = isImageFile(file) ? "image" : "video";

      // Add to state immediately — shows "Optimizing..." skeleton
      setFiles((prev) => [
        ...prev,
        {
          id: fileId,
          file,
          uploading: true,
          progress: 0,
          isDeleting: false,
          error: false,
          objectUrl: URL.createObjectURL(file),
          fileCategory,
        },
      ]);

      try {
        // Compress images before upload
        if (fileCategory === "image") {
          try {
            const compressed = await imageCompression(file, {
              maxSizeMB: maxImageMB,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
              initialQuality: 0.85,
            });

            // Re-check size post-compression
            if (compressed.size > maxImageMB * 1024 * 1024) {
              toast.error(
                `Image still too large after compression (${formatBytes(compressed.size)}). Max: ${maxImageMB} MB.`,
              );
              setFiles((prev) => prev.filter((f) => f.id !== fileId));
              return;
            }

            file = new File([compressed], originalFile.name, {
              type: compressed.type,
            });
          } catch (compressionError) {
            console.warn("Compression failed, using original:", compressionError);
          }
        }

        // Get presigned URL
        const { signedUrl, token, path } =
          await getPresignedUrlMutation.mutateAsync(fileKey);

        // Upload with XHR for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const pct = (e.loaded / e.total) * 100;
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId ? { ...f, progress: pct } : f,
                ),
              );
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 200) {
              setFiles((prev) => {
                const updated = prev.map((f) =>
                  f.id === fileId
                    ? { ...f, uploading: false, progress: 100, key: path }
                    : f,
                );
                notifyParent(updated);
                return updated;
              });
              toast.success(`${file.name} uploaded successfully!`);
              resolve();
            } else {
              reject(new Error(`Upload failed: HTTP ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () =>
            reject(new Error("Network error during upload")),
          );

          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", file.type);
          xhr.setRequestHeader("x-upsert", "true");
          xhr.send(file);
        });
      } catch (error) {
        console.error("Upload error:", error);
        setFiles((prev) => {
          const updated = prev.map((f) =>
            f.id === fileId
              ? { ...f, error: true, uploading: false, progress: 0 }
              : f,
          );
          notifyParent(updated);
          return updated;
        });
        toast.error(
          `Failed to upload ${file.name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    },
    [filePath, getPresignedUrlMutation, notifyParent, validateFile, maxImageMB],
  );

  // ── Remove a file ───────────────────────────────────────────────────────────
  const removeFile = useCallback(
    async (fileId: string) => {
      const fileToRemove = files.find((f) => f.id === fileId);
      if (!fileToRemove) return;

      if (fileToRemove.key) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, isDeleting: true } : f)),
        );
        try {
          await deleteFileMutation.mutateAsync(fileToRemove.key);
        } catch (error) {
          console.error("Delete error:", error);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileId ? { ...f, isDeleting: false } : f,
            ),
          );
          return;
        }
      }

      setFiles((prev) => {
        if (fileToRemove.objectUrl) URL.revokeObjectURL(fileToRemove.objectUrl);
        const updated = prev.filter((f) => f.id !== fileId);
        notifyParent(updated);
        return updated;
      });
    },
    [files, deleteFileMutation, notifyParent],
  );

  // ── Dropzone setup ──────────────────────────────────────────────────────────
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) acceptedFiles.forEach(uploadFile);
    },
    [uploadFile],
  );

  const onDropRejected = useCallback(
    (fileRejections: FileRejection[]) => {
      if (fileRejections.length === 0) return;

      const firstRejection = fileRejections[0];
      const firstCode = firstRejection.errors[0].code;

      if (firstCode === "too-many-files") {
        toast.error(`Too many files. Maximum allowed is ${maxFiles}.`);
      } else if (firstCode === "file-too-large") {
        toast.error(
          `File too large. Max: images ${maxImageMB} MB, videos ${maxVideoMB} MB.`,
        );
      } else if (firstCode === "file-invalid-type") {
        const allowed =
          mediaType === "video"
            ? "video files (MP4, MOV, WEBM)"
            : `images (${allowedImageExtensions.join(", ")})${
                mediaType === "any" ? " or videos" : ""
              }`;
        toast.error(`Invalid file type. Allowed: ${allowed}.`);
      } else {
        toast.error(`Upload rejected: ${firstRejection.errors[0].message}`);
      }
    },
    [maxFiles, maxImageMB, maxVideoMB, mediaType, allowedImageExtensions],
  );

  const acceptMap = buildAcceptMap(mediaType, allowedImageExtensions);
  // Use the larger of the two limits for dropzone's maxSize (per-file
  // validation above handles the per-type enforcement)
  const dropzoneMaxBytes = Math.max(maxImageMB, maxVideoMB) * 1024 * 1024;

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    open: openFileSelector,
  } = useDropzone({
    onDrop,
    onDropRejected,
    maxFiles,
    minSize: 5,
    maxSize: dropzoneMaxBytes,
    accept: acceptMap,
    noClick: true,
  });

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(uploadFile);
    }
  };

  // ── Constraint summary for the helper text ─────────────────────────────────
  const constraintText = (() => {
    const parts: string[] = [];
    if (mediaType !== "video") {
      parts.push(
        `Images: ${allowedImageExtensions.join(", ")} · max ${maxImageMB} MB`,
      );
    }
    if (mediaType !== "image") {
      parts.push(`Videos: MP4, MOV, WEBM · max ${maxVideoMB} MB`);
    }
    return parts.join("   |   ");
  })();

  // ── Icon for the drop zone ──────────────────────────────────────────────────
  const DropIcon =
    mediaType === "video" ? Film : mediaType === "any" ? ImageIcon : UploadCloud;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Card
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 text-center transition-colors duration-200 ease-in-out w-full h-64",
          isDragActive
            ? "border-primary bg-primary/10 border-solid"
            : "border-border hover:border-primary",
        )}
        {...getRootProps()}
      >
        <CardContent className="flex flex-col items-center justify-center w-full space-y-4">
          <div className="p-4 bg-primary/10 rounded-full text-primary">
            <DropIcon size={32} />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-semibold">{text}</p>
            <p className="text-xs text-muted-foreground">{constraintText}</p>
          </div>

          <input {...getInputProps()} />

          {/* Hidden camera input for mobile */}
          <input
            type="file"
            accept={
              mediaType === "video"
                ? "video/*"
                : allowedImageExtensions.join(",")
            }
            capture={mediaType !== "video" ? "environment" : undefined}
            className="hidden"
            ref={cameraInputRef}
            onChange={handleCameraCapture}
          />

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={openFileSelector}
              className="rounded-xl gap-2 border-primary/20 hover:bg-primary/5"
            >
              <UploadCloud size={16} />
              Choose Files
            </Button>

            {mediaType !== "video" && (
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-xl gap-2 shadow-lg"
              >
                <Camera size={16} />
                Take Photo
              </Button>
            )}
          </div>

          {isDragActive && (
            <div className="absolute inset-0 bg-primary/10 backdrop-blur-[2px] rounded-2xl flex items-center justify-center border-2 border-primary">
              <p className="font-bold text-primary">
                {mediaType === "video"
                  ? "Drop videos here"
                  : mediaType === "any"
                    ? "Drop files here"
                    : "Drop images here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── File preview grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {files.map((file) => (
          <div key={file.id} className="relative group">
            {file.fileCategory === "video" ? (
              <video
                src={file.objectUrl}
                className="rounded-xl w-full h-48 object-cover"
                controls
              />
            ) : (
              <img
                src={file.objectUrl}
                alt={file.file.name}
                className="rounded-xl w-full h-48 object-cover"
              />
            )}

            {/* Upload progress overlay */}
            {file.uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
                {file.progress === 0 ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                    <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                      Optimizing...
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                    <span className="text-white text-sm font-medium">
                      {Math.round(file.progress)}%
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Deleting overlay */}
            {file.isDeleting && (
              <div className="absolute inset-0 bg-black/60 rounded-xl flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-white mb-2" />
                <span className="text-white text-sm font-medium">Deleting...</span>
              </div>
            )}

            {/* Success badge */}
            {!file.uploading && !file.error && file.key && !file.isDeleting && (
              <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            )}

            {/* Error badge */}
            {file.error && (
              <div className="absolute inset-0 bg-red-500/20 rounded-xl flex flex-col items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500 mb-1" />
                <span className="text-red-500 text-xs font-medium">Upload Failed</span>
              </div>
            )}

            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFileIdToDelete(file.id);
              }}
              disabled={file.uploading || file.isDeleting}
              className="absolute top-2 left-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              <Trash className="w-4 h-4 text-white" />
            </button>

            {/* File name bar */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-xl p-2">
              <p className="text-white text-xs truncate">{file.file.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!fileIdToDelete} onOpenChange={(open) => !open && setFileIdToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="w-5 h-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="py-3">
              Are you sure you want to delete this media asset? This will permanently remove the file from storage and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setFileIdToDelete(null)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (fileIdToDelete) {
                  removeFile(fileIdToDelete);
                  setFileIdToDelete(null);
                }
              }}
              className="flex-1 sm:flex-none"
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageDropZone;
