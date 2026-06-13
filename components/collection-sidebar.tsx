"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link as LinkIcon, RefreshCw, Trash2 } from "lucide-react";
import { FocusDialog } from "@/components/focus-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui";
import { deleteCollection, rotateShareToken } from "@/lib/actions/collections";
import type { Collection } from "@/lib/types";

export function CollectionSidebar({ collection }: { collection: Collection }) {
  const { t } = useI18n();
  const [token, setToken] = useState(collection.shareToken);
  const [copied, setCopied] = useState(false);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/c/${token}`;
  const prettyUrl =
    collection.visibility === "public" && collection.creatorUsername
      ? `${origin}/collections/${collection.creatorUsername}/${collection.slug}`
      : null;

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  function rotate() {
    startTransition(async () => {
      const result = await rotateShareToken(collection.id);
      if (result.ok && result.token) {
        setToken(result.token);
      }
      setRotateOpen(false);
    });
  }

  return (
    <aside className="grid h-fit gap-4">
      <section className="soft-card grid gap-3 rounded-[26px] p-5">
        <h2 className="text-lg font-black leading-tight">{t("გაზიარების ბმული")}</h2>
        <p className="text-[11px] leading-snug text-muted">
          {t("გაუზიარე ეს ბმული — მხოლოდ ბმულის მქონე ნახავს ამ კოლექციას.")}
        </p>
        <div className="flex items-center gap-2 rounded-[14px] border border-oat bg-[#FAF6F0] p-2.5">
          <LinkIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden />
          <span className="truncate text-xs font-bold text-ink" title={shareUrl}>
            {shareUrl}
          </span>
        </div>
        <Button type="button" variant="secondary" onClick={() => copy(shareUrl)}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? t("ბმული დაკოპირდა") : t("ბმულის კოპირება")}
        </Button>
        {prettyUrl ? (
          <button
            type="button"
            onClick={() => copy(prettyUrl)}
            className="text-left text-[11px] font-extrabold text-muted underline-offset-2 hover:underline"
          >
            {t("საჯარო ბმულის კოპირება")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setRotateOpen(true)}
          className="inline-flex w-fit items-center gap-1.5 text-[11px] font-black text-muted transition hover:text-clay"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden /> {t("ბმულის განახლება")}
        </button>
      </section>

      <section className="soft-card grid gap-2 rounded-[26px] p-5">
        <h2 className="text-sm font-black text-danger">{t("საშიში ზონა")}</h2>
        <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 className="h-4 w-4" aria-hidden /> {t("კოლექციის წაშლა")}
        </Button>
      </section>

      {rotateOpen ? (
        <FocusDialog labelledBy="rotate-title" onClose={() => setRotateOpen(false)}>
          <h2 id="rotate-title" className="text-xl font-black leading-tight">
            {t("ბმულის განახლება?")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("ძველი ბმული გაუქმდება — ვისაც ის აქვს, ვეღარ ნახავს. ახალი ბმული თავიდან უნდა გაუზიარო.")}
          </p>
          <div className="mt-5 flex gap-2">
            <Button type="button" disabled={pending} onClick={rotate}>
              {pending ? t("მიმდინარეობს...") : t("განახლება")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setRotateOpen(false)}>
              {t("გაუქმება")}
            </Button>
          </div>
        </FocusDialog>
      ) : null}

      {deleteOpen ? (
        <FocusDialog labelledBy="delete-collection-title" onClose={() => setDeleteOpen(false)}>
          <h2 id="delete-collection-title" className="text-xl font-black leading-tight">
            {t("წავშალოთ კოლექცია?")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {t("ეს მოქმედება შეუქცევადია. რეცეპტები არ წაიშლება — მხოლოდ თავად კოლექცია.")}
          </p>
          <form action={deleteCollection} className="mt-5 flex gap-2">
            <input type="hidden" name="collectionId" value={collection.id} />
            <Button type="submit" variant="danger">
              <Trash2 className="h-4 w-4" aria-hidden /> {t("წაშლა")}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)}>
              {t("გაუქმება")}
            </Button>
          </form>
        </FocusDialog>
      ) : null}
    </aside>
  );
}
