import { Home, Search } from "lucide-react";
import { ButtonLink, EmptyState } from "./ui";

export function NotFoundContent() {
  return (
    <main className="page-main">
      <EmptyState
        mark="404"
        title="გვერდი ვერ მოიძებნა"
        description="შესაძლოა ბმული შეცვლილია ან გვერდი აღარ არსებობს."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <ButtonLink href="/">
              <Home className="h-4 w-4" />
              მთავარზე დაბრუნება
            </ButtonLink>
            <ButtonLink href="/search" variant="secondary">
              <Search className="h-4 w-4" />
              რეცეპტების ნახვა
            </ButtonLink>
          </div>
        }
      />
    </main>
  );
}
