export type EuropeanDialCode = {
  iso: string;
  name: string;
  dial: string;
};

export const EUROPEAN_DIAL_CODES: EuropeanDialCode[] = [
  { iso: "BG", name: "България", dial: "359" },
  { iso: "AT", name: "Австрия", dial: "43" },
  { iso: "AL", name: "Албания", dial: "355" },
  { iso: "AD", name: "Андора", dial: "376" },
  { iso: "BE", name: "Белгия", dial: "32" },
  { iso: "BA", name: "Босна и Херцеговина", dial: "387" },
  { iso: "VA", name: "Ватикан", dial: "379" },
  { iso: "GB", name: "Великобритания", dial: "44" },
  { iso: "DE", name: "Германия", dial: "49" },
  { iso: "GR", name: "Гърция", dial: "30" },
  { iso: "DK", name: "Дания", dial: "45" },
  { iso: "EE", name: "Естония", dial: "372" },
  { iso: "IE", name: "Ирландия", dial: "353" },
  { iso: "IS", name: "Исландия", dial: "354" },
  { iso: "ES", name: "Испания", dial: "34" },
  { iso: "IT", name: "Италия", dial: "39" },
  { iso: "XK", name: "Косово", dial: "383" },
  { iso: "LV", name: "Латвия", dial: "371" },
  { iso: "LT", name: "Литва", dial: "370" },
  { iso: "LI", name: "Лихтенщайн", dial: "423" },
  { iso: "LU", name: "Люксембург", dial: "352" },
  { iso: "MK", name: "Северна Македония", dial: "389" },
  { iso: "MT", name: "Малта", dial: "356" },
  { iso: "MD", name: "Молдова", dial: "373" },
  { iso: "MC", name: "Монако", dial: "377" },
  { iso: "NO", name: "Норвегия", dial: "47" },
  { iso: "PL", name: "Полша", dial: "48" },
  { iso: "PT", name: "Португалия", dial: "351" },
  { iso: "RO", name: "Румъния", dial: "40" },
  { iso: "RU", name: "Русия", dial: "7" },
  { iso: "SM", name: "Сан Марино", dial: "378" },
  { iso: "RS", name: "Сърбия", dial: "381" },
  { iso: "SK", name: "Словакия", dial: "421" },
  { iso: "SI", name: "Словения", dial: "386" },
  { iso: "TR", name: "Турция", dial: "90" },
  { iso: "UA", name: "Украйна", dial: "380" },
  { iso: "HU", name: "Унгария", dial: "36" },
  { iso: "FI", name: "Финландия", dial: "358" },
  { iso: "FR", name: "Франция", dial: "33" },
  { iso: "NL", name: "Нидерландия", dial: "31" },
  { iso: "HR", name: "Хърватия", dial: "385" },
  { iso: "ME", name: "Черна гора", dial: "382" },
  { iso: "CZ", name: "Чехия", dial: "420" },
  { iso: "CH", name: "Швейцария", dial: "41" },
  { iso: "SE", name: "Швеция", dial: "46" },
  { iso: "BY", name: "Беларус", dial: "375" },
  { iso: "CY", name: "Кипър", dial: "357" },
];

const BY_DIAL_LENGTH = [...EUROPEAN_DIAL_CODES].sort(
  (a, b) => b.dial.length - a.dial.length,
);

export const DEFAULT_DIAL = EUROPEAN_DIAL_CODES[0];

export function flagEmoji(iso: string): string {
  if (iso.length !== 2) return "";
  const upper = iso.toUpperCase();
  return String.fromCodePoint(
    127397 + upper.charCodeAt(0),
    127397 + upper.charCodeAt(1),
  );
}

export function splitStoredPhone(stored: string): {
  dial: string;
  iso: string;
  national: string;
} {
  const digits = stored.replace(/\D/g, "");
  if (!digits) {
    return { dial: DEFAULT_DIAL.dial, iso: DEFAULT_DIAL.iso, national: "" };
  }

  const match = BY_DIAL_LENGTH.find((item) => digits.startsWith(item.dial));
  if (!match) {
    return { dial: DEFAULT_DIAL.dial, iso: DEFAULT_DIAL.iso, national: digits };
  }

  return {
    dial: match.dial,
    iso: match.iso,
    national: digits.slice(match.dial.length),
  };
}

export function composePhone(dial: string, national: string): string {
  let local = national.replace(/\D/g, "");
  if (local.startsWith("0")) {
    local = local.replace(/^0+/, "");
  }
  if (!local) {
    return "";
  }
  return `${dial}${local}`;
}
