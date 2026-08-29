import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Menu, PackageSearch, ShoppingCart, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRODUCTS } from "@/lib/products";
import { Wordmark } from "./Wordmark";
import { useCart } from "./CartContext";
import { CartDrawer } from "./CartDrawer";
import { SearchSelect } from "@/components/ui/search-select";
import { useCurrency } from "@/contexts/CurrencyContext";

const CURRENCY_NAMES: Record<string, string> = {
  INR: "Indian rupee",
  USD: "US dollar",
  EUR: "Euro",
  GBP: "British pound",
  AED: "UAE dirham",
  SAR: "Saudi riyal",
  CAD: "Canadian dollar",
  AUD: "Australian dollar",
  SGD: "Singapore dollar",
  MYR: "Malaysian ringgit",
  QAR: "Qatari riyal",
  KWD: "Kuwaiti dinar",
  ZAR: "South African rand",
};

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
  const { currency, currencies, rateSource, setCurrency } = useCurrency();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
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
      <header
        className={`z-50 grid h-13 grid-cols-[1fr_auto_1fr] items-center px-3 transition-colors duration-300 sm:px-5 ${
          darkHeader
            ? "pointer-events-none fixed inset-x-0 top-3 text-white mix-blend-difference"
            : "sticky top-0 border-b border-black/10 bg-white text-black"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          className="pointer-events-auto grid h-10 w-10 place-items-center justify-self-start hover:opacity-55"
        >
          <Menu className="h-5 w-5" strokeWidth={1.7} />
        </button>

        <Link
          to="/"
          aria-label="BADR home"
          className="pointer-events-auto px-4 py-2 hover:opacity-60"
        >
          <Wordmark size="md" />
        </Link>

        <div className="flex items-center justify-self-end gap-2 sm:gap-4">
          <Link
            to="/shop"
            className={`pointer-events-auto bg-black px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white sm:px-5 sm:text-[10px] ${darkHeader ? "hidden" : ""}`}
          >
            Buy now
          </Link>
          <button
            type="button"
            onClick={() => cart.setOpen(true)}
            aria-label={`Cart${cart.count ? `, ${cart.count} items` : ""}`}
            className="pointer-events-auto relative grid h-10 w-9 place-items-center hover:opacity-55"
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
          className={`absolute inset-y-0 left-0 flex w-[calc(100%-16px)] max-w-[395px] flex-col overflow-y-auto bg-white text-black transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
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

          <nav className="mt-22 px-7 uppercase">
            <Link
              to="/shop"
              onClick={closeMenu}
              className="block font-display text-4xl leading-none hover:opacity-45 sm:text-5xl"
            >
              Shop all
            </Link>
            <div className="mt-9">
              <p className="text-[9px] font-semibold tracking-[0.18em] text-black/40">Fragrances</p>
              <div className="mt-4 space-y-2">
                {PRODUCTS.map((product) => (
                  <Link
                    key={product.id}
                    to="/product/$id"
                    params={{ id: product.id }}
                    onClick={closeMenu}
                    className="group flex items-center justify-between gap-5 py-1.5 hover:opacity-45"
                  >
                    <span className="font-display text-3xl leading-none sm:text-4xl">
                      {product.name}
                    </span>
                    <span className="hidden max-w-32 text-right text-[8px] leading-3 tracking-[0.1em] text-black/35 sm:block">
                      {product.tag}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <Link
              to="/wishlist"
              onClick={closeMenu}
              className="mt-9 block font-display text-2xl leading-none hover:opacity-45"
            >
              Wishlist
            </Link>
          </nav>

          <div className="mt-auto px-7 pb-8">
            <SearchSelect
              label="Display currency"
              value={currency}
              options={currencies.map((code) => ({
                value: code,
                label: `${code} — ${CURRENCY_NAMES[code] || code}`,
                keywords: CURRENCY_NAMES[code],
              }))}
              searchPlaceholder="Search currencies…"
              onValueChange={setCurrency}
              triggerClassName="h-11 bg-white"
            />
            <p className="mt-2 text-[9px] leading-4 text-black/42">
              {rateSource === "exchangerate-api.com"
                ? "Converted from INR using live rates."
                : "Showing INR while live rates are unavailable."}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <Link
                to="/track-order"
                search={{ order: undefined, email: undefined }}
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
    <footer className="border-t border-white/10 bg-black px-6 py-20 text-center text-white">
      <Wordmark size="lg" className="mx-auto block" />
      <p className="mt-5 font-display text-xl leading-tight">
        Rare Air. Crafted for the Relentless.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/55">
        <Link to="/shop">Shop</Link>
        <Link to="/account">Account</Link>
        <Link to="/track-order" search={{ order: undefined, email: undefined }}>
          Track order
        </Link>
      </div>
      <p className="mt-10 text-[10px] text-white/40">ESTD 1448 AH · Made in India</p>
    </footer>
  );
}
