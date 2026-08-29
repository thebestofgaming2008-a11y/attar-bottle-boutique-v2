import type { SearchSelectOption } from "@/components/ui/search-select";

const PREFERRED_CODES = [
  "IN",
  "AE",
  "SA",
  "GB",
  "US",
  "CA",
  "AU",
  "BE",
  "NL",
  "DE",
  "FR",
  "MY",
  "SG",
  "ZA",
] as const;

const NON_SHIPPING_REGION_CODES = new Set([
  "AC",
  "AN",
  "BU",
  "CP",
  "CS",
  "DG",
  "EA",
  "EU",
  "EZ",
  "FX",
  "IC",
  "NT",
  "QO",
  "SU",
  "TA",
  "TP",
  "UK",
  "UN",
  "YD",
  "YU",
  "ZR",
  "ZZ",
]);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryFlag(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

const generatedCountries = Array.from({ length: 26 * 26 }, (_, index) => {
  const code = `${String.fromCharCode(65 + Math.floor(index / 26))}${String.fromCharCode(
    65 + (index % 26),
  )}`;
  const name = regionNames.of(code);
  return { code, name };
}).filter(
  (country): country is { code: string; name: string } =>
    typeof country.name === "string" &&
    Boolean(country.name) &&
    country.name !== country.code &&
    !country.name.toLowerCase().includes("unknown region") &&
    !NON_SHIPPING_REGION_CODES.has(country.code),
);

const preferredRank = new Map<string, number>(PREFERRED_CODES.map((code, index) => [code, index]));

export const COUNTRY_OPTIONS: SearchSelectOption[] = generatedCountries
  .sort((left, right) => {
    const leftRank = preferredRank.get(left.code);
    const rightRank = preferredRank.get(right.code);
    if (leftRank != null || rightRank != null) {
      return (leftRank ?? Number.MAX_SAFE_INTEGER) - (rightRank ?? Number.MAX_SAFE_INTEGER);
    }
    return left.name.localeCompare(right.name, "en");
  })
  .map(({ code, name }) => ({
    value: name,
    label: name,
    leading: countryFlag(code),
    keywords: code,
  }));

const COUNTRY_NAME_BY_CODE = new Map(
  generatedCountries.map(({ code, name }) => [code.toUpperCase(), name]),
);

export function countryNameFromCode(code: string | null | undefined) {
  return COUNTRY_NAME_BY_CODE.get(String(code ?? "").toUpperCase()) ?? null;
}
