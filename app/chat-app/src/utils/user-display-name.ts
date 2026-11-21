type DisplayNameUser = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

const INVALID_NAME_VALUES = new Set([
  "0",
  "0 0",
  "null",
  "null null",
  "undefined",
  "undefined undefined",
  "false",
  "nan",
]);

function meaningfulNamePart(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || INVALID_NAME_VALUES.has(normalized.toLowerCase())) return null;
  return normalized;
}

export function getUserDisplayName(
  user: DisplayNameUser,
  fallback = "Потребител",
): string {
  const fullName = [
    meaningfulNamePart(user.firstName),
    meaningfulNamePart(user.lastName),
  ]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  if (fullName) return fullName;

  const accountName = meaningfulNamePart(user.name);
  if (accountName) return accountName;

  const username = meaningfulNamePart(user.username);
  if (username) return username;

  const email = meaningfulNamePart(user.email);
  if (email) return email.split("@")[0] || fallback;

  return fallback;
}
