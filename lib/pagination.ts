export const DEFAULT_PAGE_SIZE = 12;

export type Paginable = { id: string; createdAt: string };

export type Cursor = { createdAt: string; id: string };

export type PageResult<T> = {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  isFirstPage: boolean;
  startIndex: number;
  pageSize: number;
  totalCount: number;
};

export function encodeCursor(item: Paginable): string {
  const raw = `${item.createdAt}|${item.id}`;
  return Buffer.from(raw, "utf-8").toString("base64url");
}

export function decodeCursor(value: unknown): Cursor | null {
  if (typeof value !== "string" || !value) return null;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf-8");
    const separator = decoded.lastIndexOf("|");
    if (separator <= 0) return null;
    const createdAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!createdAt || !id) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function readCursorParam(
  searchParams: Record<string, string | string[] | undefined>,
  key = "cursor",
): string | undefined {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function sortByCreatedAtDesc<T extends Paginable>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });
}

export function paginate<T extends Paginable>(
  sortedItems: T[],
  cursorParam: unknown,
  pageSize = DEFAULT_PAGE_SIZE,
): PageResult<T> {
  const cursor = decodeCursor(cursorParam);
  let startIndex = 0;

  if (cursor) {
    const index = sortedItems.findIndex(
      (item) => item.createdAt === cursor.createdAt && item.id === cursor.id,
    );
    if (index >= 0) startIndex = index + 1;
  }

  if (startIndex > sortedItems.length) startIndex = sortedItems.length;

  const slice = sortedItems.slice(startIndex, startIndex + pageSize);
  const hasNext = startIndex + pageSize < sortedItems.length;
  const hasPrev = startIndex > 0;

  const nextCursor =
    hasNext && slice.length > 0 ? encodeCursor(slice[slice.length - 1]) : null;

  let prevCursor: string | null = null;
  if (hasPrev) {
    const anchor = startIndex - pageSize - 1;
    if (anchor >= 0) {
      prevCursor = encodeCursor(sortedItems[anchor]);
    }
  }

  return {
    items: slice,
    nextCursor,
    prevCursor,
    isFirstPage: !hasPrev,
    startIndex,
    pageSize,
    totalCount: sortedItems.length,
  };
}
