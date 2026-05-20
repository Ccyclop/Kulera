import { Suspense } from "react";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";

export default function LoginPage() {
  return (
    <AuthCard title="შესვლა">
      <Suspense fallback={<div className="mt-5 text-sm font-bold text-muted">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
