import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth-forms";

export default function RegisterPage() {
  return (
    <AuthCard title="რეგისტრაცია">
      <RegisterForm />
    </AuthCard>
  );
}
