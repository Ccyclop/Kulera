import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="secondary">
        <LogOut className="h-4 w-4" aria-hidden />
        გასვლა
      </Button>
    </form>
  );
}
