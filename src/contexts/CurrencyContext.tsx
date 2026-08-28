import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type RateSource = "fallback" | "exchangerate-api.com";

type CurrencyContextValue = {
  currency: string;
  currencies: string[];
  detectedCountry: string | null;
  loading: boolean;
  sourceTimestamp: string | null;
  rateSource: RateSource;
  rateError: string | null;
  setCurrency: (currency: string) => void;
  convertFromInr: (amount: number | null | undefined) => number | null;
  format: (amountInr: number | null | undefined) => string;
};

type GeoResponse = {
  country?: string;
  currency?: string;
};

type RatesResponse = {
  base?: string;
  rates?: Record<string, number>;
  source?: RateSource;
  fetchedAt?: string;
  error?: string | null;
};

const CurrencyContext = createContext<CurrencyContextValue | null>(null);
const STORAGE_KEY = "badr_currency_v1";
const MANUAL_KEY = "badr_currency_manual_v1";
const COUNTRY_KEY = "badr_detected_country_v1";

const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "CAD",
  "AUD",
  "SGD",
  "MYR",
  "QAR",
  "KWD",
  "ZAR",
] as const;
const INR_RATES: Record<string, number> = {
  INR: 1,
};

function supportedCurrency(value: string | null | undefined) {
  const next = String(value ?? "")
    .trim()
    .toUpperCase();
  return CURRENCIES.includes(next as (typeof CURRENCIES)[number]) ? next : "INR";
}

function readStoredCurrency() {
  if (typeof window === "undefined") return "INR";
  return supportedCurrency(window.localStorage.getItem(STORAGE_KEY));
}

function hasManualCurrency() {
  return typeof window !== "undefined" && window.localStorage.getItem(MANUAL_KEY) === "1";
}

function cleanRates(value: RatesResponse | null | undefined) {
  if (value?.source !== "exchangerate-api.com") return { INR: 1 };
  const rawRates = value?.rates ?? {};
  return CURRENCIES.reduce<Record<string, number>>(
    (acc, code) => {
      const rate = rawRates[code];
      if (Number.isFinite(rate) && rate > 0) acc[code] = rate;
      return acc;
    },
    { INR: 1 },
  );
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(readStoredCurrency);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(COUNTRY_KEY);
  });
  const [geoLoading, setGeoLoading] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({ INR: 1 });
  const [rateSource, setRateSource] = useState<RateSource>("fallback");
  const [rateError, setRateError] = useState<string | null>(null);
  const [sourceTimestamp, setSourceTimestamp] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRatesLoading(true);
    fetch("/api/rates", { headers: { accept: "application/json" }, cache: "no-store" })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<RatesResponse>)
          : Promise.reject(new Error(`Rates lookup failed (${res.status})`)),
      )
      .then((data: RatesResponse) => {
        if (cancelled) return;
        setRates(cleanRates(data));
        setRateSource(data.source === "exchangerate-api.com" ? "exchangerate-api.com" : "fallback");
        setSourceTimestamp(data.fetchedAt ?? new Date().toISOString());
        setRateError(
          data.source === "exchangerate-api.com"
            ? null
            : data.error || "Live exchange rates are unavailable.",
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setRateSource("fallback");
          setRateError(
            error instanceof Error ? error.message : "Could not load live exchange rates.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (hasManualCurrency()) return;
    let cancelled = false;
    setGeoLoading(true);
    fetch("/api/geo", { headers: { accept: "application/json" } })
      .then((res) =>
        res.ok
          ? (res.json() as Promise<GeoResponse>)
          : Promise.reject(new Error("Geo lookup failed")),
      )
      .then((data: GeoResponse) => {
        if (cancelled) return;
        const nextCurrency = supportedCurrency(data.currency);
        const nextCountry =
          String(data.country ?? "")
            .trim()
            .toUpperCase() || null;
        setCurrencyState(nextCurrency);
        setDetectedCountry(nextCountry);
        window.localStorage.setItem(STORAGE_KEY, nextCurrency);
        if (nextCountry) window.localStorage.setItem(COUNTRY_KEY, nextCountry);
      })
      .catch((error) => {
        if (!cancelled)
          setRateError(error instanceof Error ? error.message : "Could not detect currency");
      })
      .finally(() => {
        if (!cancelled) setGeoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = useCallback((next: string) => {
    const clean = supportedCurrency(next);
    setCurrencyState(clean);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, clean);
      window.localStorage.setItem(MANUAL_KEY, "1");
    }
  }, []);

  const convertFromInr = useCallback(
    (amount: number | null | undefined) => {
      if (amount == null) return null;
      const rate = rates[currency];
      if (!Number.isFinite(rate) || rate <= 0) return null;
      return amount * rate;
    },
    [currency, rates],
  );

  const format = useCallback(
    (amountInr: number | null | undefined) => {
      const converted = convertFromInr(amountInr);
      if (converted == null) {
        if (amountInr == null) return "-";
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(amountInr);
      }
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "INR" ? 0 : 2,
      }).format(converted);
    },
    [convertFromInr, currency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: [...CURRENCIES],
      detectedCountry,
      loading: geoLoading || ratesLoading,
      sourceTimestamp,
      rateSource,
      rateError,
      setCurrency,
      convertFromInr,
      format,
    }),
    [
      convertFromInr,
      currency,
      detectedCountry,
      format,
      geoLoading,
      rateError,
      rateSource,
      ratesLoading,
      setCurrency,
      sourceTimestamp,
    ],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
