import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
        scope instanceof Element &&
        scope.matches("main > section, main > div, main article, [data-store-reveal], footer > *")
      ) {
        registerTarget(scope);
      }
      const targets = scope.querySelectorAll(
        "main > section, main > div, main article, [data-store-reveal], footer > *",
      );
      for (const target of targets) {
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

  return (
    <>
      <header
        data-scrolled={scrolled || undefined}
        className={`pointer-events-none fixed inset-x-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center px-4 text-white transition-[top,padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:px-6 ${scrolled ? "top-3" : "top-4 sm:top-6"}`}
      >
        <button
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          className="header-control motion-button pointer-events-auto grid h-11 w-11 place-items-center justify-self-start rounded-full bg-black/75 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl hover:scale-105 hover:bg-black"
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
          className="header-control motion-button pointer-events-auto rounded-full bg-black/75 px-5 py-2.5 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl hover:scale-[1.03] hover:bg-black"
        >
          <Wordmark size="sm" />
        </Link>

        <button
          onClick={() => {
            setMenuOpen(false);
            cart.setOpen(true);
          }}
          aria-label="Open cart"
          className="header-control motion-button pointer-events-auto relative grid h-11 w-11 place-items-center justify-self-end rounded-full bg-black/75 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur-xl hover:scale-105 hover:bg-black"
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
          className={`store-menu-links grid w-full max-w-sm gap-3 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            menuOpen ? "menu-open translate-y-0 opacity-100" : "translate-y-6 opacity-0"
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
