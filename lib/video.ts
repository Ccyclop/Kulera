export type VideoSource =
  | { kind: "file"; src: string }
  | { kind: "youtube"; embedSrc: string; thumbnailSrc: string }
  | { kind: "vimeo"; embedSrc: string }
  | { kind: "external"; src: string };

function extractYouTubeId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.slice(1) || null;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }
      const embedMatch = url.pathname.match(/^\/(embed|shorts|v)\/([^/]+)/);
      if (embedMatch?.[2]) return embedMatch[2];
    }

    return null;
  } catch {
    return null;
  }
}

function extractVimeoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (!host.endsWith("vimeo.com") && !host.endsWith("player.vimeo.com")) return null;
    const match = url.pathname.match(/(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function resolveVideoSource(value: string | null | undefined): VideoSource | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(trimmed)) {
    return { kind: "file", src: trimmed };
  }

  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return {
      kind: "youtube",
      embedSrc: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`,
      thumbnailSrc: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      kind: "vimeo",
      embedSrc: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "external", src: trimmed };
  }

  return null;
}
