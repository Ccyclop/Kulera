"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      {...props}
      title="კულინარის გვერდი ვერ ჩაიტვირთა"
      description="პროფილის წაკითხვისას შეცდომა მოხდა."
    />
  );
}
