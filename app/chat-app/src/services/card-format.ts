export function luhnValid(digits: string): boolean {
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }

  let sum = 0;
  let alternate = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (!Number.isInteger(digit)) {
      return false;
    }

    if (alternate) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return "visa";
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]|7[01]|720)/.test(digits)) {
    return "mastercard";
  }
  if (/^3[47]/.test(digits)) return "amex";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "card";
}

export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D+/g, "").slice(0, 19);
  if (detectCardBrand(digits) === "amex") {
    return digits.replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  }

  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function formatExpiryInput(value: string): string {
  const digits = value.replace(/\D+/g, "").slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function parseExpiry(value: string): { month: number; year: number } | null {
  const match = value.trim().match(/^(\d{1,2})\s*[\/.\-]\s*(\d{2}|\d{4})$/);
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  let year = Number(match[2]);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  if (year < 100) {
    year += 2000;
  }

  return { month, year };
}

export function parseCardScanText(text: string): {
  number: string;
  expiry: string | null;
  holderName: string | null;
} | null {
  const normalized = text.replace(/[^\S\n]+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const digitGroups = normalized.match(/(?:\d[ -]*){13,19}/g) ?? [];
  let number = "";

  for (const group of digitGroups) {
    const digits = group.replace(/\D+/g, "");
    if (luhnValid(digits)) {
      number = formatCardNumber(digits);
      break;
    }
  }

  if (!number) {
    return null;
  }

  const expiryMatch = normalized.match(
    /\b(0[1-9]|1[0-2])\s*[\/.\-]\s*((?:20)?\d{2})\b/,
  );
  const expiry = expiryMatch
    ? `${expiryMatch[1]}/${expiryMatch[2].slice(-2)}`
    : null;

  const ignored = /visa|master\s*card|mastercard|amex|american\s*express|debit|credit|valid|thru|expires|month|year|cvv|cvc/i;
  const holderLine = normalized
    .split("\n")
    .map((line) => line.trim())
    .find((line) => {
      if (line.length < 5 || /\d{5,}/.test(line) || ignored.test(line)) {
        return false;
      }

      return /^[A-Za-zÀ-ž .'-]{5,40}$/.test(line);
    });

  return {
    number,
    expiry,
    holderName: holderLine ?? null,
  };
}

export function brandLabel(brand: string): string {
  switch (brand) {
    case "visa":
      return "Visa";
    case "mastercard":
      return "Mastercard";
    case "amex":
      return "American Express";
    case "discover":
      return "Discover";
    default:
      return "Карта";
  }
}
