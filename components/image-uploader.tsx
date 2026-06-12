"use client";

import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/i18n-provider";
import { AVATAR_BUCKET, RECIPE_BUCKET, getAvatarUrl, getRecipeImageUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";

type Bucket = typeof RECIPE_BUCKET | typeof AVATAR_BUCKET;

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

async function resizeToWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas 2D context unavailable.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image as WebP."))),
      "image/webp",
      0.85,
    );
  });
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function bucketResolver(bucket: Bucket) {
  return bucket === AVATAR_BUCKET ? getAvatarUrl : getRecipeImageUrl;
}

export function ImageUploader({
  bucket,
  pathPrefix,
  value,
  onChange,
  name,
  aspect = "video",
  maxBytes = DEFAULT_MAX_BYTES,
  label = "ფოტოს ატვირთვა",
  helper = "JPG, PNG ან WebP — მაქს. 5MB.",
}: {
  bucket: Bucket;
  pathPrefix: string;
  value?: string | null;
  onChange?: (path: string | null) => void;
  name?: string;
  aspect?: "video" | "square";
  maxBytes?: number;
  label?: string;
  helper?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState<string | null>(value ?? null);
  const [previewUrl, setPreviewUrl] = useState<string>(() =>
    value ? bucketResolver(bucket)(value) : "",
  );
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const initialValueRef = useRef<string | null>(value ?? null);
  const { t } = useI18n();

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const update = (next: string | null) => {
    setPath(next);
    onChange?.(next);
  };

  const swapPreview = (url: string) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreviewUrl(url);
  };

  const swapPreviewObject = (file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
  };

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("მხოლოდ JPG, PNG ან WebP ფაილებია დაშვებული.");
      return;
    }

    swapPreviewObject(file);
    setStatus("uploading");

    try {
      const blob = await resizeToWebp(file);
      if (blob.size > maxBytes) {
        setError("ფაილი 5MB-ზე დიდია კომპრესიის შემდეგაც.");
        setStatus("idle");
        return;
      }

      const supabase = createClient();
      const cleanedPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
      const objectPath = `${cleanedPrefix}/${randomId()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(objectPath, blob, { contentType: "image/webp", upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        setStatus("idle");
        return;
      }

      const previousPath = path;
      update(objectPath);
      swapPreview(bucketResolver(bucket)(objectPath));

      // Each upload gets a unique filename, so a replaced photo would otherwise be orphaned.
      // Drop the file we uploaded earlier in this session — but never the saved value, which
      // the server only removes once the form is actually submitted.
      if (previousPath && previousPath !== objectPath && previousPath !== initialValueRef.current) {
        void supabase.storage.from(bucket).remove([previousPath]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "ატვირთვა ვერ მოხერხდა.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleRemove() {
    if (!path) {
      update(null);
      swapPreview("");
      return;
    }

    setError(null);
    const supabase = createClient();
    const { error: removeError } = await supabase.storage.from(bucket).remove([path]);
    if (removeError && removeError.message) {
      setError(removeError.message);
      return;
    }
    update(null);
    swapPreview("");
    if (inputRef.current) inputRef.current.value = "";
  }

  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";
  const hasPreview = Boolean(previewUrl);

  return (
    <div className="grid gap-2">
      <span className="field-label">{t(label)}</span>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "relative grid place-items-center overflow-hidden rounded-[22px] border border-dashed border-sand bg-[#FAF6F0] text-center transition",
          aspectClass,
          isDragging && "border-clay bg-soft-clay/40",
          status === "uploading" && "opacity-80",
        )}
      >
        {hasPreview ? (
          <Image
            src={previewUrl}
            alt={`${t(label)} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-cover"
            unoptimized={previewUrl.startsWith("blob:")}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid place-items-center gap-2 rounded-[18px] p-6 text-center focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60"
            aria-describedby={helperId}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-soft-clay text-clay-dark">
              <Upload className="h-5 w-5" aria-hidden />
            </span>
            <strong className="block text-lg font-black">{t("ფოტო")}</strong>
            <span id={helperId} className="block text-sm leading-relaxed text-muted">
              {t(helper)}
            </span>
          </button>
        )}

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="sr-only"
          aria-describedby={error ? errorId : helperId}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />

        {hasPreview ? (
          <div className="absolute inset-x-3 bottom-3 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface/95 px-3 text-[12px] font-black text-ink shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              {t("შეცვლა")}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex min-h-9 items-center gap-1 rounded-full bg-danger/90 px-3 text-[12px] font-black text-white shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-danger/30"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {t("წაშლა")}
            </button>
          </div>
        ) : null}

        {status === "uploading" ? (
          <div className="absolute inset-0 grid place-items-center bg-surface/70 text-sm font-black text-ink" role="status" aria-live="polite">
            {t("იტვირთება…")}
          </div>
        ) : null}
      </div>

      {error ? (
        <span id={errorId} className="text-sm font-bold text-danger" role="alert">
          {t(error)}
        </span>
      ) : null}

      {name ? <input type="hidden" name={name} value={path ?? ""} readOnly /> : null}
    </div>
  );
}
