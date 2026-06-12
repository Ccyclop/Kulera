"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { AVATAR_BUCKET } from "@/lib/storage";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  accountDeleteSchema,
  accountPasswordSchema,
  accountProfileSchema,
  type AccountField,
} from "@/lib/validation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AccountActionState = {
  fieldErrors?: Partial<Record<AccountField, string>>;
  formError?: string;
  message?: string;
  ok?: boolean;
  requiresReauth?: boolean;
  toastKey?: number;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableFormString(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value ? value : null;
}

function fieldErrorsFromZod(error: ZodError): AccountActionState["fieldErrors"] {
  const errors: AccountActionState["fieldErrors"] = {};

  error.issues.forEach((issue) => {
    const field = issue.path[0];

    if (typeof field === "string" && !errors[field as AccountField]) {
      errors[field as AccountField] = issue.message;
    }
  });

  return errors;
}

async function getAuthenticatedContext() {
  if (!hasSupabaseConfig()) {
    return {
      error: "Supabase არ არის კონფიგურირებული.",
      supabase: null,
      userId: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  if (error || !userId) {
    redirect(`/login?redirectTo=${encodeURIComponent("/account")}`);
  }

  return {
    error: null,
    supabase,
    userId,
  };
}

function revalidateAccountPaths(username?: string | null) {
  revalidatePath("/");
  revalidatePath("/account");
  revalidatePath("/top-kulinaris");

  if (username) {
    revalidatePath(`/cooks/${username}`);
  }
}

async function getProfileUsername(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase.from("profiles").select("username, avatar_url").eq("id", userId).maybeSingle();

  if (error) {
    return {
      error: "პროფილის მოძებნა ვერ მოხერხდა.",
      username: null,
      avatarPath: null,
    };
  }

  return {
    error: null,
    username: typeof data?.username === "string" ? data.username : null,
    avatarPath: typeof data?.avatar_url === "string" ? data.avatar_url : null,
  };
}

function isRecentLoginError(message: string) {
  const normalized = message.toLocaleLowerCase("en-US");
  return normalized.includes("reauth") || normalized.includes("recent") || normalized.includes("security");
}

function accountDeleteOrigin(requestHeaders: Headers) {
  const host = requestHeaders.get("host");
  if (!host) return null;

  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host}`;
}

async function callAccountDeleteRoute() {
  const requestHeaders = await headers();
  const origin = accountDeleteOrigin(requestHeaders);

  if (!origin) {
    return {
      error: "ანგარიშის წაშლის მისამართი ვერ განისაზღვრა.",
      ok: false,
    };
  }

  const response = await fetch(`${origin}/api/account/delete`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cookie": requestHeaders.get("cookie") ?? "",
      "x-kulera-internal-action": "account-delete",
    },
    body: JSON.stringify({}),
    cache: "no-store",
  });

  if (response.ok) {
    return {
      error: null,
      ok: true,
    };
  }

  let payload: { error?: string } = {};

  try {
    payload = (await response.json()) as { error?: string };
  } catch {
    payload = {};
  }

  return {
    error: payload.error ?? "ანგარიშის წაშლა ვერ მოხერხდა.",
    ok: false,
  };
}

export async function updateProfile(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const context = await getAuthenticatedContext();

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const parsed = accountProfileSchema.safeParse({
    fullName: formString(formData, "fullName"),
    username: formString(formData, "username"),
    bio: formString(formData, "bio"),
    avatarPath: nullableFormString(formData, "avatarPath"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFromZod(parsed.error),
      formError: "შეასწორე მონიშნული ველები.",
    };
  }

  const input = parsed.data;

  if (input.avatarPath && !input.avatarPath.startsWith(`${context.userId}/`)) {
    return {
      fieldErrors: {
        avatarPath: "ავატარის ფაილი შენს ანგარიშს უნდა ეკუთვნოდეს.",
      },
      formError: "ავატარის შენახვა ვერ მოხერხდა.",
    };
  }

  const currentProfile = await getProfileUsername(context.supabase, context.userId);

  if (currentProfile.error) {
    return { formError: currentProfile.error };
  }

  const { data: usernameOwner, error: usernameError } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("username", input.username)
    .neq("id", context.userId)
    .maybeSingle();

  if (usernameError) {
    return { formError: "Username-ის შემოწმება ვერ მოხერხდა." };
  }

  if (usernameOwner) {
    return {
      fieldErrors: {
        username: "ეს username უკვე დაკავებულია.",
      },
      formError: "აირჩიე სხვა username.",
    };
  }

  const { error } = await context.supabase.from("profiles").upsert(
    {
      id: context.userId,
      full_name: input.fullName,
      username: input.username,
      bio: input.bio || null,
      avatar_url: input.avatarPath,
    },
    { onConflict: "id" },
  );

  if (error) {
    return { formError: error.message };
  }

  // The avatar uses a unique filename per upload, so a changed (or removed) avatar leaves the
  // old object behind. Delete it now that the new path is committed, and only if it is ours.
  const previousAvatar = currentProfile.avatarPath;
  if (previousAvatar && previousAvatar !== input.avatarPath && previousAvatar.startsWith(`${context.userId}/`)) {
    const { error: avatarCleanupError } = await context.supabase.storage.from(AVATAR_BUCKET).remove([previousAvatar]);

    if (avatarCleanupError) {
      console.error(`[supabase:avatar-cleanup] ${avatarCleanupError.message}`);
    }
  }

  const { error: metadataError } = await context.supabase.auth.updateUser({
    data: {
      full_name: input.fullName,
      username: input.username,
    },
  });

  if (metadataError) {
    console.error(`[supabase:update-user-metadata] ${metadataError.message}`);
  }

  revalidateAccountPaths(currentProfile.username);
  revalidateAccountPaths(input.username);

  return {
    message: "პროფილი განახლდა.",
    ok: true,
    toastKey: Date.now(),
  };
}

export async function updatePassword(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const context = await getAuthenticatedContext();

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const parsed = accountPasswordSchema.safeParse({
    password: formString(formData, "password"),
    confirmPassword: formString(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFromZod(parsed.error),
      formError: "შეასწორე მონიშნული ველები.",
    };
  }

  const { error } = await context.supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    if (isRecentLoginError(error.message)) {
      return {
        formError: "პაროლის შესაცვლელად თავიდან შედი ანგარიშში და სცადე ხელახლა.",
        requiresReauth: true,
      };
    }

    return { formError: error.message };
  }

  return {
    message: "პაროლი განახლდა.",
    ok: true,
    toastKey: Date.now(),
  };
}

export async function updateNotificationPrefs(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const context = await getAuthenticatedContext();

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const notificationPrefs = {
    comments: formData.get("comments") === "on",
    ratings: formData.get("ratings") === "on",
  };

  const { error } = await context.supabase
    .from("profiles")
    .update({
      notification_prefs: notificationPrefs,
    })
    .eq("id", context.userId);

  if (error) {
    return { formError: error.message };
  }

  revalidateAccountPaths();

  return {
    message: "შეტყობინებები განახლდა.",
    ok: true,
    toastKey: Date.now(),
  };
}

export async function deleteAccount(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const context = await getAuthenticatedContext();

  if (!context.supabase || !context.userId) {
    return { formError: context.error ?? "ავტორიზაცია ვერ დადასტურდა." };
  }

  const currentProfile = await getProfileUsername(context.supabase, context.userId);

  if (currentProfile.error || !currentProfile.username) {
    return { formError: currentProfile.error ?? "პროფილის მოძებნა ვერ მოხერხდა." };
  }

  const parsed = accountDeleteSchema.safeParse({
    confirmUsername: formString(formData, "confirmUsername"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFromZod(parsed.error),
      formError: "დადასტურება არასწორია.",
    };
  }

  const confirmUsername = parsed.data.confirmUsername;

  if (confirmUsername !== currentProfile.username) {
    return {
      fieldErrors: {
        confirmUsername: "წასაშლელად ზუსტად ჩაწერე შენი username.",
      },
      formError: "დადასტურება არასწორია.",
    };
  }

  const result = await callAccountDeleteRoute();

  if (!result.ok) {
    return { formError: result.error ?? "ანგარიშის წაშლა ვერ მოხერხდა." };
  }

  await context.supabase.auth.signOut();
  revalidatePath("/");
  revalidatePath("/account");
  redirect("/login?accountDeleted=1");
}
