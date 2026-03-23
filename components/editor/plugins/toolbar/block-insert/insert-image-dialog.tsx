"use client";

import { useState, useRef, type ChangeEvent } from "react";
import { LexicalEditor } from "lexical";
import { uploadImageToSupabase } from "@/components/editor/utils/upload-image";
import { INSERT_IMAGE_COMMAND } from "../../images-plugin.js";

interface InsertImageDialogProps {
  activeEditor: LexicalEditor;
  onClose: () => void;
}

export function InsertImageDialog({
  activeEditor,
  onClose,
}: InsertImageDialogProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Logic Functions ---

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError("Image size must be less than 10MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Create local preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      // Default bucket from env or "bucket4ol", path "richTextImages"
      const result = await uploadImageToSupabase(file, "bucket4ol", "richTextImages");

      if (result.error) throw result.error;

      setImageUrl(result.publicUrl);
      setAltText(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  const handleInsert = () => {
    if (!imageUrl.trim()) {
      setError("Please provide an image URL or upload a file");
      return;
    }

    activeEditor.dispatchCommand(INSERT_IMAGE_COMMAND, {
      src: imageUrl,
      altText: altText || "Image",
      caption: caption || undefined,
    });

    onClose();
  };

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    setPreview(url);
    setError(null);
  };

  return (
    <div className="w-full max-w-lg p-1">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-2 font-medium transition-colors ${
            mode === "upload"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-4 py-2 font-medium transition-colors ${
            mode === "url"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground"
          }`}
        >
          URL
        </button>
      </div>

      {mode === "upload" ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Choose File"}
          </button>
          <p className="text-sm mt-2 text-muted-foreground">or drag and drop</p>
        </div>
      ) : (
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border rounded-md"
        />
      )}

      {preview && (
        <div className="mt-4 border rounded-lg overflow-hidden">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-48 object-contain"
          />
        </div>
      )}

      <div className="mt-4 space-y-4">
        <input
          placeholder="Alt text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
        <input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm"
        />
      </div>

      {error && <p className="mt-2 text-red-500 text-xs">{error}</p>}

      <div className="flex justify-end gap-2 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm border rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleInsert}
          disabled={!imageUrl || isUploading}
          className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          Insert
        </button>
      </div>
    </div>
  );
}

