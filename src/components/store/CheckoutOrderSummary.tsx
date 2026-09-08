import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronUp, X } from "lucide-react";

const mobileQuery = "(max-width: 1023px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(mobileQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches;
const serverSnapshot = () => false;

export function CheckoutOrderSummary({
  total,
  error,
  busy = false,
  children,
}: {
  total: string;
  error?: string;
  busy?: boolean;
  children: ReactNode;
}) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mobile && error && !busy) setOpen(true);
  }, [mobile, error, busy]);
  useEffect(() => {
    if (!mobile || busy) setOpen(false);
  }, [mobile, busy]);

  if (!mobile)
    return (
      <aside className="checkout-summary hidden min-w-0 text-foreground lg:sticky lg:top-28 lg:block lg:bg-secondary/40 lg:p-8">
        <h2 className="text-lg font-semibold">Your order</h2>
        {children}
      </aside>
    );

  return (
    <Dialog.Root open={open && !busy} onOpenChange={setOpen}>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background px-5 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.05)]">
        <Dialog.Trigger asChild>
          <button
            type="button"
            disabled={busy}
            className="flex min-h-20 w-full items-center justify-between gap-5 text-left disabled:opacity-50"
          >
            <span>
              <span className="flex items-center gap-2 text-sm font-medium">
                Your order
                <ChevronUp className="h-4 w-4" />
              </span>
              {error ? (
                <span className="mt-1 block text-xs text-red-700">Check discount code</span>
              ) : null}
            </span>
            <span className="text-lg font-semibold tabular-nums">{total}</span>
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="store-viewport-overlay fixed inset-0 z-[60] bg-black/35 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 motion-reduce:animate-none" />
        <Dialog.Content
          className="store-bottom-dialog fixed inset-x-0 bottom-0 z-[61] flex max-h-[85dvh] flex-col bg-background text-foreground shadow-xl duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom motion-reduce:animate-none"
          onOpenAutoFocus={(event) => {
            // Opening the summary should not summon the phone keyboard.
            event.preventDefault();
            closeRef.current?.focus();
          }}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-foreground/15 px-5 py-4">
            <Dialog.Title className="text-lg font-semibold">Your order</Dialog.Title>
            <Dialog.Close asChild>
              <button
                ref={closeRef}
                type="button"
                aria-label="Close order summary"
                className="flex h-11 w-11 items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
            <Dialog.Description className="sr-only">
              Review your items, gifts, discount code and order total.
            </Dialog.Description>
          </header>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-2">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
