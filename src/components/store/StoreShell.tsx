import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Heart, Menu, PackageSearch, ShoppingCart, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRODUCTS } from "@/lib/products";
import { Wordmark } from "./Wordmark";
import { useCart } from "./CartContext";
import { CartDrawer } from "./CartDrawer";

export function StoreShell({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const registered = new WeakSet<Element>();
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("store-reveal-in");
          reveal.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -7% 0px" },
    );

    let revealIndex = 0;
    const registerTarget = (target: Element) => {
      if (registered.has(target)) return;
      registered.add(target);
      target.classList.add("store-reveal");
      (target as HTMLElement).style.setProperty(
        "--store-reveal-delay",
        `${(revealIndex++ % 4) * 55}ms`,
      );
      const bounds = target.getBoundingClientRect();
      if (bounds.bottom > 0 && bounds.top < window.innerHeight * 0.94) {
        target.classList.add("store-reveal-in");
      } else {
        reveal.observe(target);
      }
    };
    const register = (scope: Element) => {
      if (
        scope.matches("main > section, main > div, main article, [data-store-reveal], footer > *")
      ) {
        registerTarget(scope);
      }
      for (const target of scope.querySelectorAll(
        "main > section, main > div, main article, [data-store-reveal], footer > *",
      )) {
        registerTarget(target);
      }
    };

    register(root);
    root.classList.add("store-motion-ready");
    const changes = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) register(node);
        }
      }
    });
    changes.observe(root, { childList: true, subtree: true });

    return () => {
      changes.disconnect();
      reveal.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="store-motion min-h-screen bg-background text-foreground">
      <SiteHeader />
      <div className="page-enter">{children}</div>
      <CartDrawer />
    </div>
  );
}

function SiteHeader() {
  const cart = useCart();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [fragrancesOpen, setFragrancesOpen] = useState(false);
  const darkHeader = pathname === "/";

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <div className="flex h-6 items-center justify-center bg-white px-4 text-center text-[8px] font-semibold uppercase tracking-[0.2em] text-black">
        <span className="sm:hidden">India shipping included</span>
        <span className="hidden sm:inline">
          India shipping included · International orders on WhatsApp
        </span>
      </div>
      <header
        className={`sticky top-0 z-50 grid h-13 grid-cols-[1fr_auto_1fr] items-center px-3 transition-colors duration-300 sm:px-5 ${
          darkHeader ? "bg-black text-white" : "border-b border-black/10 bg-white text-black"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="grid h-10 w-10 place-items-center justify-self-start hover:opacity-55"
        >
          <Menu className="h-5 w-5" strokeWidth={1.7} />
        </button>

        <Link to="/" aria-label="BADR home" className="px-4 py-2 hover:opacity-60">
          <Wordmark size="md" />
        </Link>

        <div className="flex items-center justify-self-end gap-2 sm:gap-4">
          <Link
            to="/shop"
            className={`px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] sm:px-5 sm:text-[10px] ${
              darkHeader ? "bg-white text-black" : "bg-black text-white"
            }`}
          >
            Buy now
          </Link>
          <button
            type="button"
            onClick={() => cart.setOpen(true)}
            aria-label={`Cart${cart.count ? `, ${cart.count} items` : ""}`}
            className="relative grid h-10 w-9 place-items-center hover:opacity-55"
          >
            <ShoppingCart className="h-5 w-5" strokeWidth={1.7} />
            {cart.count ? (
              <span className="cart-count-pop absolute -right-0.5 top-0.5 text-[8px] font-bold">
                {cart.count}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-0 z-[70] transition-[visibility] ${
          menuOpen ? "visible" : "invisible pointer-events-none"
        }`}
      >
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={closeMenu}
          className={`absolute inset-0 h-full w-full bg-black/72 transition-opacity duration-500 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          aria-label="Main navigation"
          className={`absolute inset-y-0 left-0 flex w-[calc(100%-16px)] max-w-[395px] flex-col bg-white text-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            onClick={closeMenu}
            aria-label="Close menu"
            className="absolute left-3 top-3 grid h-10 w-10 place-items-center border border-black/25 hover:bg-black hover:text-white"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>

          <nav className="mt-21 text-[12px] font-semibold uppercase tracking-[0.08em]">
            <Link to="/shop" onClick={closeMenu} className="block px-7 py-4 hover:bg-black/5">
              Shop all
            </Link>
            <div>
              <button
                type="button"
                onClick={() => setFragrancesOpen((open) => !open)}
                aria-expanded={fragrancesOpen}
                className="flex w-full items-center justify-between bg-black/[0.035] px-7 py-4 text-left hover:bg-black/[0.07]"
              >
                Fragrances
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${fragrancesOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className={`grid overflow-hidden transition-[grid-template-rows] duration-400 ${
                  fragrancesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0">
                  {PRODUCTS.map((product) => (
                    <Link
                      key={product.id}
                      to="/product/$id"
                      params={{ id: product.id }}
                      onClick={closeMenu}
                      className="flex items-center gap-3 border-b border-black/8 px-7 py-3 pl-10 hover:bg-black/5"
                    >
                      <img src={product.image} alt="" className="h-9 w-9 object-contain" />
                      {product.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link to="/wishlist" onClick={closeMenu} className="block px-7 py-4 hover:bg-black/5">
              Wishlist
            </Link>
          </nav>

          <div className="mt-auto px-7 pb-8">
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/track-order"
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-center gap-2 border border-black/15 text-[10px] font-semibold uppercase tracking-[0.08em] hover:bg-black hover:text-white"
              >
                <PackageSearch className="h-4 w-4" /> Track order
              </Link>
              <Link
                to="/account"
                onClick={closeMenu}
                className="flex min-h-12 items-center justify-center gap-2 border border-black/15 text-[10px] font-semibold uppercase tracking-[0.08em] hover:bg-black hover:text-white"
              >
                <UserRound className="h-4 w-4" /> Account
              </Link>
            </div>
            <Link
              to="/wishlist"
              onClick={closeMenu}
              className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]"
            >
              <Heart className="h-4 w-4" /> Saved fragrances
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-black px-6 py-14 text-white sm:px-8 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Wordmark size="lg" />
          <h2 className="mt-6 max-w-md font-display text-3xl leading-[0.95] sm:text-5xl">
            Rare air. Crafted for the relentless.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-8 text-xs sm:grid-cols-3">
          <FooterGroup title="Fragrances">
            {PRODUCTS.map((product) => (
              <Link key={product.id} to="/product/$id" params={{ id: product.id }}>
                {product.name}
              </Link>
            ))}
          </FooterGroup>
          <FooterGroup title="Store">
            <Link to="/shop">Shop all</Link>
            <Link to="/account">Account</Link>
            <Link to="/wishlist">Wishlist</Link>
          </FooterGroup>
          <FooterGroup title="Support">
            <Link to="/track-order">Track order</Link>
            <Link to="/checkout">Checkout</Link>
          </FooterGroup>
        </div>
      </div>
      <div className="mx-auto mt-16 flex max-w-7xl flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-[9px] uppercase tracking-[0.16em] text-white/50">
        <span>© {new Date().getFullYear()} BADR</span>
        <span>ESTD 1448 AH · Made in India</span>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
        {title}
      </h3>
      <div className="flex flex-col gap-3 [&_a]:transition-opacity [&_a:hover]:opacity-50">
        {children}
      </div>
    </section>
  );
}
