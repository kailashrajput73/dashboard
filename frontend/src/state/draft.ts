// Quotation draft store — lightweight event-emitter shared across screens.
// Kept in memory + persisted to AsyncStorage so a mid-session app switch survives.

import { useEffect, useState, useSyncExternalStore } from "react";
import { storage } from "@/src/utils/storage";
import type { CatalogItem } from "@/src/api/endpoints";

export type DraftLine = {
  itemId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

const K_DRAFT = "quotation:draft";

let lines: DraftLine[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
  // fire & forget persist
  storage.setItem(K_DRAFT, JSON.stringify(lines));
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

async function hydrate() {
  if (hydrated) return;
  const raw = (await storage.getItem<string | null>(K_DRAFT, null)) as
    | string
    | null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) lines = parsed;
    } catch {}
  }
  hydrated = true;
  emit();
}

export function useHydratedDraft(): { hydrated: boolean; lines: DraftLine[] } {
  const [ready, setReady] = useState(hydrated);
  useEffect(() => {
    if (!hydrated) hydrate().then(() => setReady(true));
    else setReady(true);
  }, []);
  const snap = useSyncExternalStore(subscribe, () => lines, () => lines);
  return { hydrated: ready, lines: snap };
}

export function useDraftLines(): DraftLine[] {
  return useSyncExternalStore(subscribe, () => lines, () => lines);
}

export function addToDraft(item: CatalogItem) {
  const existing = lines.find((l) => l.itemId === item.id);
  if (existing) {
    lines = lines.map((l) =>
      l.itemId === item.id ? { ...l, quantity: l.quantity + 1 } : l,
    );
  } else {
    lines = [
      ...lines,
      {
        itemId: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: 1,
        unitPrice: item.standardRate,
      },
    ];
  }
  emit();
}

export function updateLine(itemId: string, patch: Partial<DraftLine>) {
  lines = lines.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l));
  emit();
}

export function removeLine(itemId: string) {
  lines = lines.filter((l) => l.itemId !== itemId);
  emit();
}

export function clearDraft() {
  lines = [];
  emit();
}

export function getLineCount(): number {
  return lines.length;
}

// Totals calculator — purely local, real-time.
export type MoneyConfigVisible = {
  discountPercent: number;
  gstPercent: number;
  specialDiscountPercent: number;
  showDiscount: boolean;
  showGst: boolean;
  showSpecialDiscount: boolean;
};

export type Totals = {
  subtotal: number;
  discountAmount: number;
  specialDiscountAmount: number;
  gstAmount: number;
  grandTotal: number;
};

export function computeTotals(
  ls: DraftLine[],
  cfg: MoneyConfigVisible,
): Totals {
  const subtotal = ls.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const discountAmount = cfg.showDiscount
    ? (subtotal * (Number(cfg.discountPercent) || 0)) / 100
    : 0;
  const afterDiscount = subtotal - discountAmount;
  const specialDiscountAmount = cfg.showSpecialDiscount
    ? (afterDiscount * (Number(cfg.specialDiscountPercent) || 0)) / 100
    : 0;
  const afterSpecial = afterDiscount - specialDiscountAmount;
  const gstAmount = cfg.showGst
    ? (afterSpecial * (Number(cfg.gstPercent) || 0)) / 100
    : 0;
  const grandTotal = afterSpecial + gstAmount;
  return { subtotal, discountAmount, specialDiscountAmount, gstAmount, grandTotal };
}
