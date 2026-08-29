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

const ISO_COUNTRY_CODES = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ
VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW
`
  .trim()
  .split(/\s+/);

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryFlag(code: string) {
  return code
    .toUpperCase()
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}

const generatedCountries = ISO_COUNTRY_CODES.map((code) => {
  const name = regionNames.of(code);
  return { code, name };
}).filter(
  (country): country is { code: string; name: string } =>
    typeof country.name === "string" &&
    Boolean(country.name) &&
    country.name !== country.code &&
    !country.name.toLowerCase().includes("unknown region"),
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
