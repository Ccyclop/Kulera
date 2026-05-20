import { PageShell } from "@/components/page-shell";

export default function Loading() {
  return (
    <PageShell>
      <main className="page-main">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]" aria-hidden="true">
          <div className="grid gap-5">
            <div className="h-[360px] animate-pulse rounded-[30px] bg-[#EDE1D3]" />
            <div className="soft-card grid gap-3 rounded-[26px] p-6">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[#EDE1D3]" />
              <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-[#EDE1D3]" />
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-[#EDE1D3]" />
              <div className="h-3 w-2/3 animate-pulse rounded-full bg-[#EDE1D3]" />
            </div>
            <div className="soft-card grid gap-3 rounded-[26px] p-6">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="h-3 w-full animate-pulse rounded-full bg-[#EDE1D3]" />
              ))}
            </div>
          </div>
          <aside className="grid content-start gap-4">
            <div className="soft-card h-[180px] animate-pulse rounded-[26px] bg-[#EDE1D3]" />
            <div className="soft-card h-[220px] animate-pulse rounded-[26px] bg-[#EDE1D3]" />
          </aside>
        </div>
      </main>
    </PageShell>
  );
}
