"use client";

import { useState, useTransition } from "react";
import { Check, FolderPlus, Globe, Link as LinkIcon, Loader2, Lock, Plus } from "lucide-react";
import { FocusDialog } from "@/components/focus-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Button, ButtonLink } from "@/components/ui";
import { createCollectionForRecipe, toggleRecipeInCollection } from "@/lib/actions/collections";
import type { CollectionVisibility, RecipeVisibility } from "@/lib/types";

type CollectionOption = { id: string; title: string; visibility: CollectionVisibility };

const visibilityIcon = { public: Globe, unlisted: LinkIcon, private: Lock } as const;

export function AddToCollection({
  recipeId,
  recipeSlug,
  recipeVisibility,
  isAuthenticated,
  collections: initialCollections,
  initialMemberships,
}: {
  recipeId: string;
  recipeSlug: string;
  recipeVisibility: RecipeVisibility;
  isAuthenticated: boolean;
  collections: CollectionOption[];
  initialMemberships: string[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<CollectionOption[]>(initialCollections);
  const [memberships, setMemberships] = useState<Set<string>>(() => new Set(initialMemberships));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <ButtonLink href={`/login?redirectTo=/recipes/${recipeSlug}`} variant="secondary">
        <FolderPlus className="h-4 w-4" />
        {t("კოლექციაში დამატება")}
      </ButtonLink>
    );
  }

  function toggle(collection: CollectionOption) {
    if (pending) return;
    // A public collection only accepts public recipes — block early with a hint.
    if (!memberships.has(collection.id) && collection.visibility === "public" && recipeVisibility !== "public") {
      setError("საჯარო კოლექციაში მხოლოდ საჯარო რეცეპტი ემატება.");
      return;
    }
    setError(null);
    setPendingId(collection.id);
    startTransition(async () => {
      const result = await toggleRecipeInCollection(collection.id, recipeId);
      if (result.ok) {
        setMemberships((prev) => {
          const next = new Set(prev);
          if (result.inCollection) next.add(collection.id);
          else next.delete(collection.id);
          return next;
        });
      } else {
        setError(result.error ?? "ვერ მოხერხდა.");
      }
      setPendingId(null);
    });
  }

  function quickCreate() {
    const title = newTitle.trim();
    if (!title || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createCollectionForRecipe(title, recipeId);
      if (result.ok && result.collectionId) {
        const created: CollectionOption = { id: result.collectionId, title, visibility: "private" };
        setCollections((prev) => [created, ...prev]);
        setMemberships((prev) => new Set(prev).add(created.id));
        setNewTitle("");
      } else {
        setError(result.error ?? "ვერ მოხერხდა.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <FolderPlus className="h-4 w-4" aria-hidden />
        {t("კოლექციაში დამატება")}
      </Button>

      {open ? (
        <FocusDialog
          labelledBy="add-to-collection-title"
          onClose={() => setOpen(false)}
          className="border-oat"
        >
          <h2 id="add-to-collection-title" className="text-xl font-black leading-tight">
            {t("აირჩიე კოლექცია")}
          </h2>

          {error ? (
            <p className="mt-3 rounded-[14px] border border-danger/20 bg-danger/5 px-3 py-2 text-xs font-extrabold text-danger" aria-live="polite">
              {t(error)}
            </p>
          ) : null}

          <div className="mt-4 grid max-h-[46vh] gap-2 overflow-y-auto pr-1">
            {collections.length === 0 ? (
              <p className="text-sm font-bold text-muted">{t("ჯერ კოლექცია არ შეგიქმნია — შექმენი ქვემოთ.")}</p>
            ) : (
              collections.map((collection) => {
                const inCollection = memberships.has(collection.id);
                const VisibilityIcon = visibilityIcon[collection.visibility];
                const blocked = !inCollection && collection.visibility === "public" && recipeVisibility !== "public";

                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => toggle(collection)}
                    disabled={blocked}
                    aria-pressed={inCollection}
                    className={`flex items-center justify-between gap-3 rounded-[16px] border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      inCollection ? "border-clay bg-soft-clay/50" : "border-oat bg-surface hover:border-sand"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <VisibilityIcon className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                      <span className="truncate text-sm font-black text-ink">{collection.title}</span>
                    </span>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                        inCollection ? "border-clay bg-clay text-white" : "border-oat text-transparent"
                      }`}
                    >
                      {pendingId === collection.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-clay" aria-hidden />
                      ) : (
                        <Check className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 border-t border-oat pt-4">
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  quickCreate();
                }
              }}
              placeholder={t("ახალი კოლექციის სახელი")}
              className="field-control flex-1"
              aria-label={t("ახალი კოლექციის სახელი")}
            />
            <Button type="button" onClick={quickCreate} disabled={pending || !newTitle.trim()}>
              <Plus className="h-4 w-4" aria-hidden />
              {t("შექმნა")}
            </Button>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {t("მზადაა")}
            </Button>
          </div>
        </FocusDialog>
      ) : null}
    </>
  );
}
