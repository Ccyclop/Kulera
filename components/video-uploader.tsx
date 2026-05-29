"use client";

import { Film, Link as LinkIcon, Upload, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/components/i18n-provider";
import { RECIPE_VIDEO_BUCKET, getRecipeVideoUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { resolveVideoSource } from "@/lib/video";

const ACCEPTED_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_BYTES = 100 * 1024 * 1024;

type Mode = "file" | "link";

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function fileExtension(file: File): string {
  const fromName = file.name.split(".").pop();
  if (fromName) return fromName.toLowerCase();
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

function isLinkValue(value: string) {
  return /^https?:\/\//i.test(value);
}

function initialMode(value: string | null | undefined): Mode {
  if (!value) return "file";
  return isLinkValue(value) ? "link" : "file";
}

export function VideoUploader({
  pathPrefix,
  value,
  onChange,
  label = "ვიდეო რეცეპტი",
  helper = "ატვირთე MP4/WebM (მაქს. 100MB) ან ჩასვი YouTube/Vimeo ლინკი. არასავალდებულოა.",
}: {
  pathPrefix: string;
  value?: string | null;
  onChange?: (next: string | null) => void;
  label?: string;
  helper?: string;
}) {
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(() => initialMode(value));
  const [stored, setStored] = useState<string | null>(value ?? null);
  const [linkDraft, setLinkDraft] = useState<string>(() => (value && isLinkValue(value) ? value : ""));
  const [linkError, setLinkError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  const update = (next: string | null) => {
    setStored(next);
    onChange?.(next);
  };

  const previewUrl = stored ? (isLinkValue(stored) ? stored : getRecipeVideoUrl(stored)) : "";
  const previewSource = useMemo(
    () => (stored ? resolveVideoSource(previewUrl || stored) : null),
    [previewUrl, stored],
  );

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_MIME.includes(file.type)) {
      setError("მხოლოდ MP4, WebM ან MOV ფაილებია დაშვებული.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ფაილი 100MB-ზე დიდია.");
      return;
    }

    setStatus("uploading");
    try {
      const supabase = createClient();
      const cleanedPrefix = pathPrefix.replace(/^\/+|\/+$/g, "");
      const objectName = `${randomId()}.${fileExtension(file)}`;
      const objectPath = `${cleanedPrefix}/${objectName}`;

      const { error: uploadError } = await supabase.storage
        .from(RECIPE_VIDEO_BUCKET)
        .upload(objectPath, file, { contentType: file.type, upsert: true });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      update(objectPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ატვირთვა ვერ მოხერხდა.");
    } finally {
      setStatus("idle");
    }
  }

  async function handleRemove() {
    setError(null);
    if (stored && !isLinkValue(stored)) {
      const supabase = createClient();
      const { error: removeError } = await supabase.storage.from(RECIPE_VIDEO_BUCKET).remove([stored]);
      if (removeError && removeError.message) {
        setError(removeError.message);
        return;
      }
    }
    update(null);
    setLinkDraft("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function applyLink() {
    const trimmed = linkDraft.trim();
    if (!trimmed) {
      update(null);
      setLinkError(null);
      return;
    }
    const resolved = resolveVideoSource(trimmed);
    if (!resolved) {
      setLinkError("ბმული ვერ ამოვიცანი (გამოიყენე YouTube, Vimeo ან პირდაპირი .mp4/.webm).");
      return;
    }
    setLinkError(null);
    update(trimmed);
  }

  return (
    <div className="grid gap-2">
      <span className="field-label">{t(label)}</span>

      <div className="inline-flex w-fit gap-1 rounded-full border border-oat bg-paper/75 p-1">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black",
            mode === "file" ? "bg-surface text-clay shadow-soft" : "text-muted hover:text-ink",
          )}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden />
          {t("ფაილი")}
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs font-black",
            mode === "link" ? "bg-surface text-clay shadow-soft" : "text-muted hover:text-ink",
          )}
        >
          <LinkIcon className="h-3.5 w-3.5" aria-hidden />
          YouTube / Vimeo
        </button>
      </div>

      {mode === "file" ? (
        <div className="grid gap-2 rounded-[22px] border border-dashed border-sand bg-[#FAF6F0] p-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-oat bg-surface px-4 text-sm font-black text-ink transition hover:border-sand"
            aria-describedby={helperId}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {status === "uploading" ? t("იტვირთება…") : stored && !isLinkValue(stored) ? t("სხვა ფაილის ატვირთვა") : t("ვიდეო ფაილის ატვირთვა")}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_MIME.join(",")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </div>
      ) : (
        <div className="grid gap-2 rounded-[22px] border border-dashed border-sand bg-[#FAF6F0] p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onBlur={applyLink}
              placeholder="https://youtube.com/watch?v=…"
              className="field-control bg-surface"
            />
            <button
              type="button"
              onClick={applyLink}
              className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[15px] border border-oat bg-surface px-4 text-xs font-black"
            >
              {t("დამატება")}
            </button>
          </div>
          {linkError ? (
            <span className="text-xs font-extrabold text-danger">{t(linkError)}</span>
          ) : null}
        </div>
      )}

      <span id={helperId} className="text-xs leading-relaxed text-muted">
        {t(helper)}
      </span>

      {error ? (
        <span className="text-sm font-bold text-danger" role="alert">
          {t(error)}
        </span>
      ) : null}

      {stored ? (
        <div className="flex items-center justify-between gap-3 rounded-[18px] border border-oat bg-surface p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-soft-clay text-clay-dark">
              <Film className="h-4 w-4" aria-hidden />
            </span>
            <div className="grid">
              <strong className="text-sm font-black leading-tight">
                {previewSource?.kind === "youtube"
                  ? t("YouTube ვიდეო დაკავშირებული")
                  : previewSource?.kind === "vimeo"
                    ? t("Vimeo ვიდეო დაკავშირებული")
                    : isLinkValue(stored)
                      ? t("გარე ვიდეო ბმული")
                      : t("ვიდეო ფაილი ატვირთული")}
              </strong>
              <span className="text-xs text-muted truncate max-w-[260px]">
                {isLinkValue(stored) ? stored : stored.split("/").pop()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-danger/10 px-3 text-xs font-black text-danger transition hover:bg-danger/15"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {t("წაშლა")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
