"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from "@/components/ui/dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useGalleryModal } from "@/stores/dialog-store";
import { Loader2, X } from "lucide-react";

export function GalleryModal() {
  const { data, isOpen, close } = useGalleryModal();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (data?.media_urls?.[0]) {
      setSelectedImage(data.media_urls[0]);
    }
  }, [data, isOpen]);

  if (!isOpen) return null;

  const getImageUrl = (img: string) =>
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${process.env.NEXT_PUBLIC_SUPABASE_BUCKET_NAME}/${img}`;

  return (
    <Dialog open={isOpen} onOpenChange={close} modal={true}>
      <DialogPortal>
        <DialogContent className="max-w-5xl! w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden border-none bg-black/95 shadow-2xl z-[100]">
          <DialogHeader className="p-4 bg-zinc-900/50 backdrop-blur-md border-b border-white/5 flex-shrink-0">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <span className="text-emerald-500">Gallery</span>
              <span className="text-zinc-500">/</span>
              <span>{data?.facility_name}</span>

              <X onClick={close} className="ml-auto stroke-red-500" />
            </DialogTitle>
          </DialogHeader>

          {/* Main Layout Container - FIXED: Added overflow-hidden */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            {/* Left Side: Fixed Preview Area */}
            <div className="flex-[3] relative bg-black flex items-center justify-center p-4 overflow-hidden">
              {selectedImage ? (
                <img
                  src={getImageUrl(selectedImage)}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain animate-in fade-in zoom-in duration-500"
                />
              ) : (
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              )}
            </div>

            {/* Right Side: Scrollable Sidebar - FIXED STRUCTURE */}
            <div className="w-full md:w-[260px] bg-zinc-900/30 border-l border-white/5 flex flex-col overflow-hidden">
              <div className="p-4 flex-shrink-0">
                <h2 className="text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em]">
                  Media Assets ({data?.media_urls?.length || 0})
                </h2>
              </div>

              {/* FIXED: Ensure ScrollArea has proper height constraints */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="grid grid-cols-4 md:grid-cols-1 gap-3 p-4">
                  {data?.media_urls?.map((img: string, i: number) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className={cn(
                        "group relative rounded-xl overflow-hidden border-2 transition-all duration-300",
                        selectedImage === img
                          ? "border-emerald-500 scale-[0.98] opacity-100"
                          : "border-transparent opacity-40 hover:opacity-80 hover:scale-[1.02] hover:cursor-pointer",
                      )}
                    >
                      <AspectRatio ratio={4 / 3}>
                        <img
                          src={getImageUrl(img)}
                          alt={`Gallery image ${i + 1}`}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      </AspectRatio>
                      {selectedImage === img && (
                        <div className="absolute inset-0 bg-emerald-500/10" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
