import { useId, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchSelectOption = {
  value: string;
  label: string;
  keywords?: string;
  leading?: string;
};

type SearchSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchSelectOption[];
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  name?: string;
};

export function SearchSelect({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Select an option",
  searchPlaceholder = "Type to search…",
  emptyText = "No matching option.",
  disabled = false,
  className,
  triggerClassName,
  name,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const control = (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-labelledby={label ? labelId : undefined}
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 border border-foreground/20 bg-background px-3 text-left text-sm font-normal normal-case tracking-normal outline-none transition hover:border-foreground/45 focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-45",
            triggerClassName,
          )}
        >
          <span className={cn("min-w-0 truncate", !selected && "text-muted-foreground")}>
            {selected?.leading ? <span className="mr-2">{selected.leading}</span> : null}
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-foreground/45" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="z-[100] w-[var(--radix-popover-trigger-width)] rounded-none border-foreground/20 p-0 shadow-xl"
      >
        <Command className="rounded-none">
          <CommandInput placeholder={searchPlaceholder} className="h-12" />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup className="p-1.5">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value} ${option.keywords || ""}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    // Keep the popover mounted until the activating pointer/click has
                    // finished so a mobile tap cannot fall through to content below it.
                    window.setTimeout(() => setOpen(false), 0);
                  }}
                  className="min-h-11 rounded-none px-3"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.leading ? <span className="text-base">{option.leading}</span> : null}
                  <span className="min-w-0 truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className={cn("grid gap-2", className)}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {label ? (
        <span id={labelId} className="text-xs font-semibold uppercase tracking-[0.13em]">
          {label}
        </span>
      ) : null}
      {control}
    </div>
  );
}
