import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PRODUCTS } from "@/lib/products";
import { writePreference } from "@/lib/safeStorage";

export type CartLine = {
  id: string;
  productId?: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  mrp: number;
  qty: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
};

export type CartProductInput = Omit<CartLine, "id" | "qty"> & { id?: string };

type CartValue = {
  lines: CartLine[];
  subtotal: number;
  count: number;
  add: (slug: string, qty?: number) => void;
  addProduct: (product: CartProductInput, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  open: boolean;
  setOpen: (value: boolean) => void;
};

const STORAGE_KEY = "badr_cart_v1";
const CartCtx = createContext<CartValue | null>(null);

function lineKey(
  product: Pick<CartProductInput, "productId" | "slug" | "selectedColor" | "selectedSize">,
) {
  return [
    product.productId || product.slug,
    product.selectedColor || "",
    product.selectedSize || "",
  ].join("::");
}

function readStoredCart() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter(
          (line) => line && line.id && line.slug && Number.isFinite(line.qty) && line.qty > 0,
        )
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  // Match the server render first, then restore the persisted cart after hydration.
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLines(readStoredCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writePreference(STORAGE_KEY, JSON.stringify(lines));
  }, [hydrated, lines]);

  const addProduct = useCallback((product: CartProductInput, qty = 1) => {
    const safeQty = Math.max(1, Math.floor(qty));
    const id = product.id || lineKey(product);
    setLines((previous) => {
      const existing = previous.find((line) => line.id === id);
      if (existing) {
        return previous.map((line) =>
          line.id === id ? { ...line, qty: line.qty + safeQty, price: product.price } : line,
        );
      }
      return [...previous, { ...product, id, qty: safeQty }];
    });
    setOpen(true);
  }, []);

  const add = useCallback(
    (slug: string, qty = 1) => {
      const product = PRODUCTS.find((candidate) => candidate.id === slug);
      if (!product) return;
      addProduct(
        {
          slug: product.id,
          name: product.name,
          image: product.image,
          price: product.price,
          mrp: product.mrp,
          selectedSize: "6 ml roll-on",
        },
        qty,
      );
    },
    [addProduct],
  );

  const setQty = useCallback((id: string, qty: number) => {
    setLines((previous) =>
      qty <= 0
        ? previous.filter((line) => line.id !== id)
        : previous.map((line) => (line.id === id ? { ...line, qty: Math.floor(qty) } : line)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const subtotal = lines.reduce((total, line) => total + line.price * line.qty, 0);
  const count = lines.reduce((total, line) => total + line.qty, 0);
  const value = useMemo(
    () => ({ lines, subtotal, count, add, addProduct, setQty, clear, open, setOpen }),
    [add, addProduct, clear, count, lines, open, setQty, subtotal],
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
