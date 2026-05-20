import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthCard title="პაროლის აღდგენა" description="შეიყვანე email და გამოგიგზავნით აღდგენის ბმულს.">
      <ForgotPasswordForm />
    </AuthCard>
  );
}
