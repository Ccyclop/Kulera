"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      {...props}
      title="ტოპ კულინარები ვერ ჩაიტვირთა"
      description="რეიტინგების მიღება ვერ მოხერხდა. სცადე თავიდან."
    />
  );
}
