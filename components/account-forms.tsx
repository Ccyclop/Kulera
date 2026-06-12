"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Bell, Save, Trash2 } from "lucide-react";
import { FocusDialog } from "@/components/focus-dialog";
import { FormToast } from "@/components/form-toast";
import { ImageUploader } from "@/components/image-uploader";
import { useI18n } from "@/components/i18n-provider";
import { deleteAccount, updateNotificationPrefs, updatePassword, updateProfile, type AccountActionState } from "@/lib/actions/account";
import type { AccountProfile } from "@/lib/data";
import { AVATAR_BUCKET } from "@/lib/storage";
import {
  accountDeleteSchema,
  accountPasswordSchema,
  accountProfileFormSchema,
  notificationPrefsSchema,
} from "@/lib/validation";
import { Button, FormInput, Textarea } from "@/components/ui";

const initialState: AccountActionState = {};

type ProfileFormValues = z.input<typeof accountProfileFormSchema>;
type PasswordFormValues = z.input<typeof accountPasswordSchema>;
type NotificationFormValues = z.input<typeof notificationPrefsSchema>;
type DeleteFormValues = z.input<typeof accountDeleteSchema>;

function errorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

function mergedError(clientError: unknown, serverError?: string) {
  return errorMessage(clientError) ?? serverError;
}

function ActionMessage({ state }: { state: AccountActionState }) {
  const { t } = useI18n();

  if (!state.formError) return null;

  return (
    <p
      className="rounded-[18px] border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-extrabold text-danger"
      role="alert"
      aria-live="assertive"
    >
      {t(state.formError)}
    </p>
  );
}

function SubmitButton({
  children,
  pending,
  variant = "primary",
}: {
  children: React.ReactNode;
  pending: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {children}
    </Button>
  );
}

export function ProfileSettingsForm({ profile, userId }: { profile: AccountProfile | null; userId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, actionPending] = useActionState(updateProfile, initialState);
  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<ProfileFormValues>({
    defaultValues: {
      fullName: profile?.fullName ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      avatarPath: profile?.avatarPath ?? "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(accountProfileFormSchema),
  });

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  function submitForm(values: ProfileFormValues) {
    if (isPending) return;

    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("username", values.username);
    formData.set("bio", values.bio);
    formData.set("avatarPath", values.avatarPath);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="soft-card rounded-[28px] p-5 md:p-7" noValidate>
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-[28px] font-black leading-tight">{t("პროფილი")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("ეს ინფორმაცია ჩანს შენს კულინარის გვერდზე.")}</p>
        </div>
        <div className="relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-sage-light text-xl font-black text-sage">
          {profile?.avatarUrl ? (
            <Image src={profile.avatarUrl} alt={`${profile.fullName} avatar`} fill sizes="64px" className="object-cover" />
          ) : (
            <span>{profile?.avatarInitial ?? "K"}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <ActionMessage state={state} />
        <input type="hidden" {...register("avatarPath")} />
        <div className="grid gap-4 md:grid-cols-[200px_1fr] md:items-start md:gap-6">
          <div className="w-full max-w-[200px]">
            <ImageUploader
              bucket={AVATAR_BUCKET}
              pathPrefix={userId}
              value={profile?.avatarPath ?? null}
              aspect="square"
              label="ავატარი"
              helper="მაქს. 5MB"
              onChange={(path) => setValue("avatarPath", path ?? "", { shouldDirty: true, shouldValidate: true })}
            />
            {mergedError(errors.avatarPath, state.fieldErrors?.avatarPath) ? (
              <span className="mt-2 block text-xs font-extrabold text-danger" aria-live="polite">
                {mergedError(errors.avatarPath, state.fieldErrors?.avatarPath)}
              </span>
            ) : null}
          </div>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="სახელი"
                placeholder="შენი სახელი"
                error={mergedError(errors.fullName, state.fieldErrors?.fullName)}
                required
                {...register("fullName")}
              />
              <FormInput
                label="Username"
                placeholder="username"
                error={mergedError(errors.username, state.fieldErrors?.username)}
                required
                {...register("username")}
              />
            </div>
            <FormInput label="Email" defaultValue={profile?.email ?? ""} readOnly />
          </div>
        </div>
        <Textarea
          label="Bio"
          placeholder="მოკლედ აღწერე შენი კულინარიული სტილი"
          error={mergedError(errors.bio, state.fieldErrors?.bio)}
          {...register("bio")}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
            <strong className="block text-lg font-black leading-none">{profile?.totalRecipes ?? 0}</strong>
              <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("ყველა რეცეპტი")}</span>
          </div>
          <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
            <strong className="block text-lg font-black leading-none">{profile?.publishedRecipes ?? 0}</strong>
              <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("გამოქვეყნებული")}</span>
          </div>
          <div className="rounded-[17px] border border-oat bg-[#FAF6F0] p-4">
            <strong className="block text-lg font-black leading-none">{profile?.savedRecipes ?? 0}</strong>
              <span className="mt-2 block text-[11px] font-extrabold text-muted">{t("შენახული")}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <SubmitButton pending={isPending}>
          <Save className="h-4 w-4" aria-hidden />
          {isPending ? "ინახება..." : "პროფილის შენახვა"}
        </SubmitButton>
      </div>
      <FormToast message={state.message} toastKey={state.toastKey} />
    </form>
  );
}

export function PasswordSettingsForm() {
  const [state, formAction, actionPending] = useActionState(updatePassword, initialState);
  const { t } = useI18n();
  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<PasswordFormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(accountPasswordSchema),
  });

  useEffect(() => {
    if (state.ok) {
      reset();
    }
  }, [reset, state.ok]);

  function submitForm(values: PasswordFormValues) {
    if (isPending) return;

    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirmPassword", values.confirmPassword);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="grid gap-4" noValidate>
      <ActionMessage state={state} />
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="ახალი პაროლი"
          type="password"
          placeholder="••••••••"
          minLength={6}
          error={mergedError(errors.password, state.fieldErrors?.password)}
          required
          {...register("password")}
        />
        <FormInput
          label="გაიმეორე პაროლი"
          type="password"
          placeholder="••••••••"
          minLength={6}
          error={mergedError(errors.confirmPassword, state.fieldErrors?.confirmPassword)}
          required
          {...register("confirmPassword")}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton pending={isPending}>
          <Save className="h-4 w-4" aria-hidden />
          {isPending ? "ინახება..." : "პაროლის შეცვლა"}
        </SubmitButton>
        {state.requiresReauth ? (
          <Link
            href="/login?redirectTo=/account"
            className="inline-flex min-h-[42px] items-center justify-center rounded-[15px] border border-oat bg-surface px-4 text-[13px] font-black no-underline transition hover:border-sand hover:bg-[#FAF6F0] focus:outline-none focus-visible:ring-4 focus-visible:ring-soft-clay/60"
          >
            {t("ხელახლა შესვლა")}
          </Link>
        ) : null}
      </div>
      <FormToast message={state.message} toastKey={state.toastKey} />
    </form>
  );
}

export function NotificationSettingsForm({ profile }: { profile: AccountProfile | null }) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, formAction, actionPending] = useActionState(updateNotificationPrefs, initialState);
  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const prefs = profile?.notificationPrefs ?? { comments: true, ratings: true };
  const { handleSubmit, register } = useForm<NotificationFormValues>({
    defaultValues: prefs,
    resolver: zodResolver(notificationPrefsSchema),
  });

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  function submitForm(values: NotificationFormValues) {
    if (isPending) return;

    const formData = new FormData();
    if (values.comments) formData.set("comments", "on");
    if (values.ratings) formData.set("ratings", "on");

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit(submitForm)} className="grid gap-4" noValidate>
      <ActionMessage state={state} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex min-h-[74px] items-center gap-3 rounded-[18px] border border-oat bg-[#FAF6F0] p-4 focus-within:ring-4 focus-within:ring-soft-clay/50">
          <input type="checkbox" className="h-5 w-5 accent-clay" {...register("comments")} />
          <span>
            <span className="block text-sm font-black">{t("კომენტარები")}</span>
            <span className="mt-1 block text-xs font-bold text-muted">{t("ახალი კომენტარები შენს რეცეპტებზე.")}</span>
          </span>
        </label>
        <label className="flex min-h-[74px] items-center gap-3 rounded-[18px] border border-oat bg-[#FAF6F0] p-4 focus-within:ring-4 focus-within:ring-soft-clay/50">
          <input type="checkbox" className="h-5 w-5 accent-clay" {...register("ratings")} />
          <span>
            <span className="block text-sm font-black">{t("შეფასებები")}</span>
            <span className="mt-1 block text-xs font-bold text-muted">{t("ახალი შეფასებები შენს რეცეპტებზე.")}</span>
          </span>
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton variant="secondary" pending={isPending}>
          <Bell className="h-4 w-4" aria-hidden />
          {isPending ? "ინახება..." : "შეტყობინებების შენახვა"}
        </SubmitButton>
      </div>
      <FormToast message={state.message} toastKey={state.toastKey} />
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { t } = useI18n();
  const [state, formAction, actionPending] = useActionState(deleteAccount, initialState);
  const [transitionPending, startTransition] = useTransition();
  const isPending = actionPending || transitionPending;
  const deleteSchema = useMemo(
    () =>
      accountDeleteSchema.refine((input) => input.confirmUsername === username, {
        path: ["confirmUsername"],
        message: "წასაშლელად ზუსტად ჩაწერე შენი username.",
      }),
    [username],
  );
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<DeleteFormValues>({
    defaultValues: {
      confirmUsername: "",
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    resolver: zodResolver(deleteSchema),
  });

  function submitForm(values: DeleteFormValues) {
    if (isPending) return;

    const formData = new FormData();
    formData.set("confirmUsername", values.confirmUsername);

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[28px] font-black leading-tight">{t("სახიფათო ზონა")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t("ანგარიშის წაშლა შეუქცევადია.")}</p>
        </div>
        <Button type="button" variant="danger" onClick={() => setDeleteOpen(true)} disabled={isPending}>
          <Trash2 className="h-4 w-4" aria-hidden />
          ანგარიშის წაშლა
        </Button>
      </div>
      {state.formError && !deleteOpen ? (
        <div className="mt-4">
          <ActionMessage state={state} />
        </div>
      ) : null}

      {deleteOpen ? (
        <FocusDialog labelledBy="delete-account-title" onClose={() => !isPending && setDeleteOpen(false)}>
          <form onSubmit={handleSubmit(submitForm)} noValidate>
            <h2 id="delete-account-title" className="text-xl font-black leading-tight">
              {t("წავშალოთ ანგარიში?")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("წაიშლება პროფილი, რეცეპტები, კომენტარები, შეფასებები და შენახვები. დასადასტურებლად ჩაწერე username.")}
            </p>
            <div className="mt-4 grid gap-3">
              <ActionMessage state={state} />
              <FormInput
                label="Username"
                placeholder={username}
                error={mergedError(errors.confirmUsername, state.fieldErrors?.confirmUsername)}
                autoComplete="off"
                required
                {...register("confirmUsername")}
              />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <SubmitButton variant="danger" pending={isPending}>
                <Trash2 className="h-4 w-4" aria-hidden />
                {isPending ? "იშლება..." : "ანგარიშის წაშლა"}
              </SubmitButton>
              <Button type="button" variant="secondary" onClick={() => setDeleteOpen(false)} disabled={isPending}>
                გაუქმება
              </Button>
            </div>
          </form>
        </FocusDialog>
      ) : null}
    </>
  );
}
