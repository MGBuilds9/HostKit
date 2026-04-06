"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, ImageIcon, Video } from "lucide-react";
import Image from "next/image";

interface MediaUploadProps {
  onUpload: (url: string, mediaType: "image" | "video") => void;
  accept?: string;
  maxImageSizeMB?: number;
  maxVideoSizeMB?: number;
  currentUrl?: string;
  currentMediaType?: "image" | "video";
}

export function MediaUpload({
  onUpload,
  accept = "image/*,video/mp4,video/quicktime",
  maxImageSizeMB = 10,
  maxVideoSizeMB = 200,
  currentUrl,
  currentMediaType,
}: MediaUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [previewType, setPreviewType] = useState<"image" | "video">(currentMediaType ?? "image");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  function detectMediaType(file: File): "image" | "video" {
    return file.type.startsWith("video/") ? "video" : "image";
  }

  async function handleFile(file: File) {
    const mediaType = detectMediaType(file);
    const maxMB = mediaType === "video" ? maxVideoSizeMB : maxImageSizeMB;
    const maxBytes = maxMB * 1024 * 1024;

    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Maximum ${mediaType} size is ${maxMB}MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          size: file.size,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }

      const { uploadUrl, publicUrl } = (await res.json()) as {
        uploadUrl: string;
        publicUrl: string;
        key: string;
      };

      setProgress(40);

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!putRes.ok) {
        throw new Error("S3 upload failed");
      }

      setProgress(100);
      setPreview(publicUrl);
      setPreviewType(mediaType);
      onUpload(publicUrl, mediaType);
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clearPreview() {
    setPreview(null);
    setPreviewType("image");
    onUpload("", "image");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {preview ? (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 rounded-md overflow-hidden border bg-muted">
            {previewType === "video" ? (
              <video
                src={preview}
                muted
                loop
                playsInline
                autoPlay
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={preview}
                alt="Uploaded preview"
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <button
            type="button"
            onClick={clearPreview}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80"
            aria-label="Remove media"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 cursor-pointer transition-colors ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          }`}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <div className="flex gap-1">
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Drag &amp; drop or{" "}
            <span className="text-primary underline">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Images up to {maxImageSizeMB}MB, videos up to {maxVideoSizeMB}MB
          </p>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Uploading…</p>
        </div>
      )}

      {!preview && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading…" : "Upload Image or Video"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        disabled={uploading}
      />
    </div>
  );
}
