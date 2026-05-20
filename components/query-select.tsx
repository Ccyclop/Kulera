"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FilterOption } from "@/lib/content-options";
import { Select } from "./ui";

export function QuerySelect({
  label,
  name,
  options,
  value,
  className,
  resetKeys = ["cursor"],
}: {
  label: string;
  name: string;
  options: Array<FilterOption<string>>;
  value: string;
  className?: string;
  resetKeys?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Select
      label={label}
      name={name}
      value={value}
      className={className}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextValue = event.target.value;

        if (!nextValue || nextValue === "all") {
          params.delete(name);
        } else {
          params.set(name, nextValue);
        }
        resetKeys.forEach((key) => params.delete(key));

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
