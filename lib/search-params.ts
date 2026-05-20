export type SearchParamRecord = Record<string, string | string[] | undefined>;

export function firstSearchParam(searchParams: SearchParamRecord, key: string) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function pathWithSearchParams(
  pathname: string,
  searchParams: SearchParamRecord,
  updates: Record<string, string | null | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    if (normalized) {
      params.set(key, normalized);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
