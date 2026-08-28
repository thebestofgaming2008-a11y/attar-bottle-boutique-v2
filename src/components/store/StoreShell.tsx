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
      <div className="page-enter">{children}</div>
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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-4 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-4 text-background sm:top-6 sm:px-6">
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="motion-button pointer-events-auto grid h-11 w-11 place-items-center justify-self-start rounded-full border border-background/20 bg-foreground/65 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl hover:scale-105 hover:bg-foreground"
        >
          <span className="relative block h-5 w-5">
            <Menu
              className={`absolute inset-0 h-5 w-5 shop-transition ${
                menuOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute inset-0 h-5 w-5 shop-transition ${
                menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
              }`}
            />
          </span>
        </button>

        <Link
          to="/"
          aria-label="BADR home"
          className="motion-button pointer-events-auto rounded-full border border-background/20 bg-foreground/65 px-5 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl hover:scale-[1.03] hover:bg-foreground"
        >
          <Wordmark size="sm" />
        </Link>

        <button
          onClick={() => {
            setMenuOpen(false);
            cart.setOpen(true);
          }}
          aria-label="Open cart"
          className="motion-button pointer-events-auto relative grid h-11 w-11 place-items-center justify-self-end rounded-full border border-background/20 bg-foreground/65 shadow-[0_12px_30px_rgba(0,0,0,0.22)] backdrop-blur-xl hover:scale-105 hover:bg-foreground"
        >
          <ShoppingBag className="h-5 w-5" />
          {cart.count > 0 ? (
            <span
              key={cart.count}
              className="cart-count-pop absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-background px-1 text-[10px] font-semibold text-foreground"
            >
              {cart.count}
            </span>
          ) : null}
        </button>
      </header>

      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-0 z-40 grid place-items-center bg-foreground px-6 pt-24 text-background transition-[opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
      >
        <nav
          aria-label="Main navigation"
          className={`grid w-full max-w-sm gap-3 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            menuOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className="motion-button border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            Home
          </Link>
          <a
            href="/shop"
            onClick={() => setMenuOpen(false)}
            className="motion-button border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            Shop all
          </a>
          <button
            onClick={() => {
              setMenuOpen(false);
              cart.setOpen(true);
            }}
            className="motion-button border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            Cart
          </button>
          <Link
            to="/account"
            onClick={() => setMenuOpen(false)}
            className="motion-button border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            Account
          </Link>
          <Link
            to="/track-order"
            onClick={() => setMenuOpen(false)}
            className="motion-button border border-background/35 px-6 py-4 text-center text-xs font-semibold uppercase tracking-[0.24em] hover:-translate-y-0.5 hover:bg-background hover:text-foreground"
          >
            Track order
          </Link>
        </nav>
      </div>
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
