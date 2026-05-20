"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      {...props}
      title="რეცეპტი ვერ ჩაიტვირთა"
      description="რეცეპტის ჩატვირთვისას შეცდომა მოხდა. სცადე თავიდან."
    />
  );
}
