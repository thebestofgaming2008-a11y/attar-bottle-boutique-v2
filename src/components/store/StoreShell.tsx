import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { useCart } from "./CartContext";
import { CartDrawer } from "./CartDrawer";

export function StoreShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      {children}
      <CartDrawer />
    </div>
  );
}

function SiteHeader() {
  const cart = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-4 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-4 text-background sm:top-6 sm:px-6">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="pointer-events-auto grid h-11 w-11 place-items-center justify-self-start rounded-full border border-background/20 bg-foreground/65 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors hover:bg-foreground"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Link
          to="/"
          aria-label="BADR home"
          className="pointer-events-auto rounded-full border border-background/20 bg-foreground/65 px-5 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl"
        >
          <Wordmark size="sm" />
        </Link>

        <button
          onClick={() => {
            setMenuOpen(false);
            cart.setOpen(true);
          }}
          aria-label="Open cart"
          className="pointer-events-auto relative grid h-11 w-11 place-items-center justify-self-end rounded-full border border-background/20 bg-foreground/65 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-colors hover:bg-foreground"
        >
          <ShoppingBag className="h-5 w-5" />
          {cart.count > 0 ? (
            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-background px-1 text-[10px] font-semibold text-foreground">
              {cart.count}
            </span>
          ) : null}
        </button>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-foreground px-6 pt-24 text-background">
          <nav aria-label="Main navigation" className="grid w-full max-w-sm gap-3">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] transition-colors hover:bg-background hover:text-foreground"
            >
              Home
            </Link>
            <a
              href="/#shop"
              onClick={() => setMenuOpen(false)}
              className="border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] transition-colors hover:bg-background hover:text-foreground"
            >
              Shop
            </a>
            <button
              onClick={() => {
                setMenuOpen(false);
                cart.setOpen(true);
              }}
              className="border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] transition-colors hover:bg-background hover:text-foreground"
            >
              Cart
            </button>
          </nav>
        </div>
      ) : null}
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-foreground px-6 py-20 text-center text-background">
      <Wordmark size="lg" className="mx-auto block" />
      <p className="mt-5 font-display text-xl leading-tight">
        Rare Air. Crafted for the Relentless.
      </p>
      <p className="mt-10 text-xs text-background/50">ESTD 1448 AH · Made in India</p>
      <div className="h-8" />
    </footer>
  );
}
