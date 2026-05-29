"use client";

import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { FocusDialog } from "@/components/focus-dialog";
import { resolveVideoSource } from "@/lib/video";

export function VideoLightboxTrigger({
  videoUrl,
  title,
  className,
}: {
  videoUrl: string;
  title: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const source = useMemo(() => resolveVideoSource(videoUrl), [videoUrl]);

  if (!source) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "absolute bottom-6 left-6 z-10 inline-flex min-h-12 items-center gap-3 rounded-full border border-white/50 bg-white/95 px-4 text-[13px] font-black"
        }
        aria-haspopup="dialog"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-clay text-white">
          <Play className="h-3 w-3 fill-current" />
        </span>
        ვიდეო რეცეპტი
      </button>

      {open ? (
        <FocusDialog
          labelledBy="video-lightbox-title"
          onClose={() => setOpen(false)}
          className="!max-w-4xl !border-transparent !bg-ink !p-3"
        >
          <h2 id="video-lightbox-title" className="sr-only">
            {title} — ვიდეო რეცეპტი
          </h2>
          <div className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-black">
            {source.kind === "file" ? (
              <video
                src={source.src}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : source.kind === "youtube" || source.kind === "vimeo" ? (
              <iframe
                src={source.embedSrc}
                title={`${title} ვიდეო`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <video
                src={source.src}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-white/60">ვიდეო რეცეპტი</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex min-h-9 items-center justify-center rounded-full bg-white px-4 text-xs font-black text-ink"
            >
              დახურვა
            </button>
          </div>
        </FocusDialog>
      ) : null}
    </>
  );
}
