import type { Ingredient } from "./types";

const FRACTION_MAP: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const QUANTITY_PATTERN =
  /^\s*(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?|\d+\s+\d+\s*\/\s*\d+|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])\s*(.*)$/u;

function parseQuantityToken(token: string): number | null {
  const trimmed = token.trim();
  if (!trimmed) return null;

  if (trimmed.length === 1 && FRACTION_MAP[trimmed] != null) {
    return FRACTION_MAP[trimmed];
  }

  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den !== 0) return whole + num / den;
  }

  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const den = Number(fractionMatch[2]);
    if (den !== 0) return num / den;
  }

  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function parseAmountText(amount: string): { quantity: number | null; unit: string; note: string } {
  const raw = (amount ?? "").trim();
  if (!raw) return { quantity: null, unit: "", note: "" };

  const match = raw.match(QUANTITY_PATTERN);
  if (!match) {
    return { quantity: null, unit: "", note: raw };
  }

  const quantity = parseQuantityToken(match[1] ?? "");
  const rest = (match[2] ?? "").trim();

  if (quantity == null) {
    return { quantity: null, unit: "", note: raw };
  }

  if (!rest) {
    return { quantity, unit: "", note: "" };
  }

  const unitMatch = rest.match(/^([^\s,]+)(?:\s+(.*))?$/);
  const unit = unitMatch?.[1] ?? "";
  const note = (unitMatch?.[2] ?? "").trim();

  return { quantity, unit, note };
}

export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) < 0.01) return "0";

  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);

  return rounded
    .toFixed(2)
    .replace(/0+$/, "")
    .replace(/\.$/, "");
}

export function formatAmount(ingredient: Pick<Ingredient, "quantity" | "unit" | "note" | "amount">): string {
  const { quantity, unit, note } = ingredient;

  if (quantity == null && !unit && !note) {
    return ingredient.amount ?? "";
  }

  const quantityText = quantity != null ? formatQuantity(quantity) : "";
  const head = [quantityText, unit].filter(Boolean).join(" ");
  return [head, note].filter(Boolean).join(" ").trim();
}

export function scaleIngredient(ingredient: Ingredient, scale: number): Ingredient {
  if (!Number.isFinite(scale) || scale <= 0 || ingredient.quantity == null) {
    return ingredient;
  }

  const scaledQuantity = ingredient.quantity * scale;
  return {
    ...ingredient,
    quantity: scaledQuantity,
    amount: formatAmount({ ...ingredient, quantity: scaledQuantity }),
  };
}

export function parseServingsCount(servings: string): number | null {
  if (!servings) return null;
  const match = servings.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]!.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}
