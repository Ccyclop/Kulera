"use client";

import { RouteError } from "@/components/route-error";

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      {...props}
      title="ძიება ვერ ჩაიტვირთა"
      description="ვერ მოვახერხეთ შედეგების მიღება. სცადე თავიდან ან შეცვალე ძიების ტექსტი."
    />
  );
}
