"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { ImageUploader } from "@/components/image-uploader";
import { Button, FormInput, Select, Textarea } from "@/components/ui";
import { createCollection, updateCollection, type CollectionActionState } from "@/lib/actions/collections";
import { RECIPE_BUCKET } from "@/lib/storage";
import type { Collection } from "@/lib/types";

const emptyState: CollectionActionState = {};

export function CollectionForm({ userId, collection }: { userId: string; collection?: Collection }) {
  const isEdit = Boolean(collection);
  const [state, formAction, pending] = useActionState(isEdit ? updateCollection : createCollection, emptyState);
  const [coverPath, setCoverPath] = useState(collection?.coverImagePath ?? "");
  const { t } = useI18n();

  return (
    <form action={formAction} className="soft-card grid gap-4 rounded-[26px] p-5 md:p-6">
      {collection ? <input type="hidden" name="collectionId" value={collection.id} /> : null}
      <input type="hidden" name="coverImageUrl" value={coverPath} />

      {state.formError ? (
        <div
          className="rounded-[18px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-extrabold text-danger"
          role="alert"
          aria-live="assertive"
        >
          {t(state.formError)}
        </div>
      ) : null}

      {state.ok && state.message ? (
        <div
          className="rounded-[18px] border border-sage/30 bg-sage-light/60 px-4 py-3 text-sm font-extrabold text-sage"
          aria-live="polite"
        >
          {t(state.message)}
        </div>
      ) : null}

      <FormInput
        label="კოლექციის სათაური"
        name="title"
        defaultValue={collection?.title ?? ""}
        placeholder="მაგ. კვირის დიეტა"
        error={state.fieldErrors?.title}
      />

      <Textarea
        label="აღწერა"
        name="description"
        defaultValue={collection?.description ?? ""}
        placeholder="მოკლედ აღწერე ეს კოლექცია"
        error={state.fieldErrors?.description}
      />

      <div className="grid gap-1.5">
        <Select label="ხილვადობა" name="visibility" defaultValue={collection?.visibility ?? "private"}>
          <option value="private">{t("პირადი — მხოლოდ შენ")}</option>
          <option value="unlisted">{t("ბმულით ხილვადი — მხოლოდ ბმულის მქონეთათვის")}</option>
          <option value="public">{t("საჯარო — ჩანს შენს პროფილზე")}</option>
        </Select>
        <p className="text-[11px] leading-snug text-muted">
          {t("საჯარო კოლექციაში მხოლოდ საჯარო რეცეპტი ემატება. ბმულით/პირადში — საჯაროც და მხოლოდ-ბმულითაც.")}
        </p>
      </div>

      <ImageUploader
        bucket={RECIPE_BUCKET}
        pathPrefix={`${userId}/collections`}
        value={collection?.coverImagePath ?? null}
        aspect="video"
        label="გარეკანის ფოტო (არჩევითი)"
        onChange={(path) => setCoverPath(path ?? "")}
      />

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("ინახება...") : isEdit ? t("ცვლილების შენახვა") : t("კოლექციის შექმნა")}
        </Button>
        <Link
          href="/account/collections"
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-black no-underline transition hover:border-sand hover:bg-[#FAF6F0]"
        >
          {t("გაუქმება")}
        </Link>
      </div>
    </form>
  );
}
