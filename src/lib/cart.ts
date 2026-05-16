import { useEffect, useState } from "react";

export type CartItem = {
  productId: string;
  shopId: string;
  shopName: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  /** Buyer-selected size/color/storage etc. — stored on order_items.selected_attributes */
  selectedAttributes?: Record<string, any>;
};

const KEY = "lm_cart_v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("lm_cart_change"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const h = () => setItems(read());
    window.addEventListener("lm_cart_change", h);
    return () => window.removeEventListener("lm_cart_change", h);
  }, []);
  return items;
}

export const cart = {
  add(item: CartItem) {
    const items = read();
    // single-shop cart
    const filtered = items.filter((i) => i.shopId === item.shopId);
    const existing = filtered.find((i) => i.productId === item.productId);
    if (existing) existing.qty += item.qty;
    else filtered.push(item);
    write(filtered);
  },
  remove(productId: string) {
    write(read().filter((i) => i.productId !== productId));
  },
  setQty(productId: string, qty: number) {
    const items = read().map((i) => (i.productId === productId ? { ...i, qty: Math.max(1, qty) } : i));
    write(items);
  },
  clear() {
    write([]);
  },
  total() {
    return read().reduce((s, i) => s + i.price * i.qty, 0);
  },
};
