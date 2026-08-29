import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Heart, Menu, PackageSearch, ShoppingBag, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SearchSelect } from "@/components/ui/search-select";
import { useCurrency } from "@/contexts/CurrencyContext";
import { PRODUCTS } from "@/lib/products";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "./CartContext";
import { Wordmark } from "./Wordmark";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        setScrolled(window.scrollY > 18);
        frame = 0;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

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
        data-scrolled={scrolled || undefined}
        className={`pointer-events-none fixed inset-x-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-4 text-white mix-blend-difference transition-[top,padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6 ${
          scrolled ? "top-2" : "top-4 sm:top-6"
        }`}
      >
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="motion-button pointer-events-auto grid h-11 w-11 place-items-center justify-self-start hover:scale-110 hover:opacity-65"
        >
          <span className="relative block h-5 w-5">
            <Menu
              className={`absolute inset-0 h-5 w-5 shop-transition ${
                menuOpen ? "rotate-90 scale-75 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
              strokeWidth={1.7}
            />
            <X
              className={`absolute inset-0 h-5 w-5 shop-transition ${
                menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-75 opacity-0"
              }`}
              strokeWidth={1.7}
            />
          </span>
        </button>

        <Link
          to="/"
          aria-label="BADR home"
          className="motion-button pointer-events-auto px-4 py-2 hover:scale-105 hover:opacity-65"
        >
          <Wordmark size="md" />
        </Link>

        <button
          type="button"
          onClick={() => {
            closeMenu();
            cart.setOpen(true);
          }}
          aria-label={`Bag${cart.count ? `, ${cart.count} items` : ""}`}
          className="motion-button pointer-events-auto relative grid h-11 w-11 place-items-center justify-self-end hover:scale-110 hover:opacity-65"
        >
          <ShoppingBag className="h-5 w-5" strokeWidth={1.7} />
          {cart.count ? (
            <span
              key={cart.count}
              className="cart-count-pop absolute right-0 top-0 grid h-4 min-w-4 place-items-center bg-white px-1 text-[9px] font-semibold text-black"
            >
              {cart.count}
            </span>
          ) : null}
        </button>
      </header>

      <div
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        className={`fixed inset-0 z-40 overflow-x-hidden overflow-y-auto bg-[#080808] px-5 pb-10 pt-26 text-white transition-[opacity,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-8 sm:pt-32 ${
          menuOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"
        }`}
      >
        <nav
          aria-label="Main navigation"
          className={`store-menu-links mx-auto grid w-full max-w-6xl gap-12 transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 ${
            menuOpen ? "menu-open translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">
              Explore BADR
            </p>
            <div className="mt-5 divide-y divide-white/15 border-y border-white/15">
              <Link
                to="/shop"
                onClick={closeMenu}
                className="menu-feature-link group flex items-center justify-between gap-5 py-5 sm:py-7"
              >
                <span className="min-w-0">
                  <strong className="block font-display text-4xl leading-none sm:text-6xl">
                    Shop collection
                  </strong>
                  <small className="mt-2 block text-xs text-white/45">
                    Browse every scent, note and mood.
                  </small>
                </span>
                <ArrowUpRight className="h-5 w-5 shrink-0 transition-[translate,rotate] duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:rotate-6 sm:h-6 sm:w-6" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  cart.setOpen(true);
                }}
                className="menu-feature-link group flex w-full items-center justify-between gap-5 py-5 text-left sm:py-7"
              >
                <span className="min-w-0">
                  <strong className="block font-display text-4xl leading-none sm:text-6xl">
                    Your bag
                  </strong>
                  <small className="mt-2 block text-xs text-white/45">
                    {cart.count
                      ? `${cart.count} item${cart.count === 1 ? "" : "s"} waiting.`
                      : "Your bag is ready when you are."}
                  </small>
                </span>
                <ShoppingBag className="h-6 w-6 shrink-0 transition-transform duration-300 group-hover:scale-110" />
              </button>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-white/65">
              <Link
                to="/account"
                onClick={closeMenu}
                className="menu-utility-link flex flex-col items-center gap-2 py-3 hover:text-white"
              >
                <UserRound className="h-4 w-4" /> Account
              </Link>
              <Link
                to="/wishlist"
                onClick={closeMenu}
                className="menu-utility-link flex flex-col items-center gap-2 py-3 hover:text-white"
              >
                <Heart className="h-4 w-4" /> Wishlist
              </Link>
              <Link
                to="/track-order"
                search={{ order: undefined, email: undefined }}
                onClick={closeMenu}
                className="menu-utility-link flex flex-col items-center gap-2 py-3 hover:text-white"
              >
                <PackageSearch className="h-4 w-4" /> Track
              </Link>
            </div>

            <div className="mt-8 max-w-md bg-white p-4 text-black">
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
              <p className="mt-2 text-[9px] leading-4 text-black/48">
                {rateSource === "exchangerate-api.com"
                  ? "Converted from INR using live rates."
                  : "Showing INR while live rates are unavailable."}
              </p>
            </div>
          </section>

          <section className="lg:border-l lg:border-white/15 lg:pl-16">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/40">
                  Five signatures
                </p>
                <h2 className="mt-3 font-display text-3xl sm:text-4xl">Choose your mood.</h2>
              </div>
              <Link
                to="/"
                onClick={closeMenu}
                className="motion-link text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45 hover:text-white"
              >
                Home
              </Link>
            </div>
            <div className="mt-6 divide-y divide-white/12">
              {PRODUCTS.map((product) => (
                <Link
                  key={product.id}
                  to="/product/$id"
                  params={{ id: product.id }}
                  onClick={closeMenu}
                  className="group flex items-center justify-between gap-5 py-4 sm:py-5"
                >
                  <span>
                    <strong className="font-display text-2xl sm:text-4xl">{product.name}</strong>
                    <small className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-white/35">
                      {product.tag}
                    </small>
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-white/35 transition-[translate,color] duration-300 group-hover:translate-x-1 group-hover:text-white" />
                </Link>
              ))}
            </div>
          </section>
        </nav>
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
