import { cookies } from "next/headers";
import { getTranslator, LOCALE_COOKIE, normalizeLocale } from "@/lib/i18n/shared";

export async function getLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);
}

export async function getServerTranslator() {
  return getTranslator(await getLocale());
}
