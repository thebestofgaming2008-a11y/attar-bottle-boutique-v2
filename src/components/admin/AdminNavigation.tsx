import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { ADMIN_NAV_GROUPS, type AdminTabKey } from "@/lib/adminNavigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavigationProps = {
  active: AdminTabKey;
  onSelect?: (key: AdminTabKey) => void;
  badges?: Partial<Record<AdminTabKey, number>>;
  disabled?: boolean;
};

export function AdminNavList({ active, onSelect, badges = {}, disabled = false }: NavigationProps) {
  return (
    <nav
      aria-label="Admin navigation"
      className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-3"
    >
      {ADMIN_NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--vibe-muted))]">
            {group.label}
          </p>
          <div className="space-y-1">
            {group.items.map(({ key, label, Icon }) => (
              <Button
                key={key}
                type="button"
                variant="ghost"
                disabled={disabled}
                aria-current={active === key ? "page" : undefined}
                data-testid={`admin-nav-${key}-button`}
                onClick={() => onSelect?.(key)}
                className={cn(
                  "admin-nav-item h-auto min-h-11 w-full justify-start gap-3 whitespace-normal rounded-md px-3 py-2.5 text-left text-sm font-medium disabled:opacity-65",
                  active === key
                    ? "bg-[rgb(var(--vibe-foreground))] text-white hover:bg-[rgb(var(--vibe-foreground))] hover:text-white"
                    : "text-[rgb(var(--vibe-muted))] hover:bg-[rgb(var(--vibe-soft))] hover:text-[rgb(var(--vibe-foreground))]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 leading-5">{label}</span>
                {Number(badges[key]) > 0 ? (
                  <span className="min-w-5 rounded px-1.5 text-center text-xs tabular-nums opacity-80">
                    {badges[key]}
                  </span>
                ) : null}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AdminMobileNavigation({
  onSignOut,
  ...props
}: NavigationProps & { onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Open admin menu"
          className="h-11 w-11 shrink-0 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="vibe-admin admin-vibe flex w-[88vw] max-w-80 flex-col gap-0 bg-white p-0 text-[rgb(var(--vibe-foreground))] [&>button]:right-3 [&>button]:top-3 [&>button]:grid [&>button]:h-11 [&>button]:w-11 [&>button]:place-items-center"
      >
        <div className="shrink-0 border-b border-[rgb(var(--vibe-border))] px-5 py-5 pr-16">
          <SheetTitle className="text-sm font-semibold">BADR admin</SheetTitle>
          <SheetDescription className="sr-only">
            Choose a store management section.
          </SheetDescription>
        </div>
        <AdminNavList
          {...props}
          onSelect={(key) => {
            props.onSelect?.(key);
            setOpen(false);
          }}
        />
        <div className="shrink-0 border-t border-[rgb(var(--vibe-border))] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full justify-start gap-3"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
