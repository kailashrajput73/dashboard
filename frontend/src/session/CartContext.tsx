import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, ProductVariant } from '../services/catalog/catalogModels';

/**
 * Flutter `CartController` — in-memory only (no persistence in Flutter either).
 * Only `addVariant` is ported; the rest arrives with the Cart module.
 */
interface CartContextValue {
  items: CartItem[];
  addVariant: (variant: ProductVariant, quantity?: number) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addVariant = useCallback((variant: ProductVariant, quantity = 1) => {
    if (quantity <= 0) return;
    const addQty = Math.max(quantity, variant.minimumOrderQuantity);
    setItems((prev) => {
      const index = prev.findIndex((i) => i.variant.id === variant.id);
      if (index < 0) return [...prev, { variant, quantity: addQty }];
      const next = [...prev];
      next[index] = { ...next[index], quantity: next[index].quantity + addQty };
      return next;
    });
  }, []);

  const value = useMemo(() => ({ items, addVariant }), [items, addVariant]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
