import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function LoginPage() {
  const t = await getServerTranslator();

  return (
    <AuthCard title="შესვლა">
      <Suspense fallback={<div className="mt-5 text-sm font-bold text-muted">{t("Loading...")}</div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
