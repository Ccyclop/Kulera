"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { removeRecipeFromCollection, reorderCollection, type ReorderItem } from "@/lib/actions/collections";
import type { CollectionMember } from "@/lib/types";

type EditorItem = {
  membershipId: string;
  recipeId: string;
  title: string;
  imageUrl: string;
  section: string;
};

const iconButton =
  "grid h-9 w-9 place-items-center rounded-[12px] border border-oat bg-surface text-muted transition hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-40";

export function CollectionEditor({ collectionId, members }: { collectionId: string; members: CollectionMember[] }) {
  const { t } = useI18n();
  const [items, setItems] = useState<EditorItem[]>(() =>
    members.map((member) => ({
      membershipId: member.membershipId,
      recipeId: member.recipe.id,
      title: member.recipe.title,
      imageUrl: member.recipe.imageUrl,
      section: member.section ?? "",
    })),
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const knownSections = [...new Set(items.map((item) => item.section.trim()).filter(Boolean))];

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  function scheduleSave(next: EditorItem[]) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");

    saveTimer.current = setTimeout(() => {
      const payload: ReorderItem[] = next.map((item, index) => ({
        membershipId: item.membershipId,
        recipeId: item.recipeId,
        section: item.section.trim() ? item.section.trim() : null,
        position: index,
      }));

      startTransition(async () => {
        const result = await reorderCollection(collectionId, payload);
        if (result.ok) {
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 1500);
        } else {
          setSaveStatus("idle");
        }
      });
    }, 500);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    scheduleSave(next);
  }

  function setSection(index: number, value: string) {
    const next = items.map((item, i) => (i === index ? { ...item, section: value } : item));
    setItems(next);
    scheduleSave(next);
  }

  function clearSections() {
    const next = items.map((item) => ({ ...item, section: "" }));
    setItems(next);
    scheduleSave(next);
  }

  function remove(index: number) {
    const item = items[index];
    setItems(items.filter((_, i) => i !== index));
    startTransition(async () => {
      await removeRecipeFromCollection(collectionId, item.recipeId);
    });
  }

  if (items.length === 0) {
    return (
      <div className="soft-card rounded-[26px] p-6 text-center">
        <p className="text-sm font-bold text-muted">
          {t("ამ კოლექციაში რეცეპტები ჯერ არ არის — დაამატე ისინი რეცეპტის გვერდიდან.")}
        </p>
      </div>
    );
  }

  return (
    <div className="soft-card grid gap-3 rounded-[26px] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-black leading-tight">{t("რეცეპტები და თანმიმდევრობა")}</h2>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            {t("მიეცი სექციის სახელი (მაგ. დღე 1), რომ გეგმად აქციო. ცარიელი = უბრალო სია.")}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-muted" aria-live="polite">
          {saveStatus === "saving" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("ინახება...")}
            </>
          ) : saveStatus === "saved" ? (
            <>
              <Check className="h-3.5 w-3.5 text-sage" aria-hidden />
              {t("შენახულია")}
            </>
          ) : null}
        </span>
      </div>

      {knownSections.length > 0 ? (
        <button
          type="button"
          onClick={clearSections}
          className="w-fit rounded-full border border-oat bg-surface px-3 py-1 text-[11px] font-black text-muted transition hover:border-clay hover:text-clay"
        >
          {t("სექციების მოშორება")}
        </button>
      ) : null}

      <datalist id="collection-sections">
        {knownSections.map((section) => (
          <option key={section} value={section} />
        ))}
      </datalist>

      <ul className="grid gap-2">
        {items.map((item, index) => (
          <li
            key={item.membershipId}
            className="grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-oat bg-[#FAF6F0] p-2"
          >
            <div className="relative h-14 w-[60px] overflow-hidden rounded-[12px] bg-placeholder">
              <Image src={item.imageUrl} alt={item.title} fill sizes="60px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-tight">{item.title}</p>
              <input
                value={item.section}
                onChange={(event) => setSection(index, event.target.value)}
                list="collection-sections"
                placeholder={t("სექცია (მაგ. დღე 1)")}
                aria-label={t("სექციის სახელი")}
                className="mt-1 w-full max-w-[220px] rounded-[10px] border border-oat bg-surface px-2 py-1 text-xs font-bold text-ink outline-none focus:border-clay"
              />
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={t("ზემოთ")} className={iconButton}>
                <ArrowUp className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label={t("ქვემოთ")}
                className={iconButton}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t("ამოღება")}
                className="grid h-9 w-9 place-items-center rounded-[12px] border border-oat bg-surface text-muted transition hover:border-danger/30 hover:bg-danger/10 hover:text-danger"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
