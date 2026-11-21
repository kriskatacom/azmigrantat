import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const header = readFileSync("../src/components/Header.tsx", "utf8");
const profile = readFileSync("../src/app/(profile)/index.tsx", "utf8");

describe("profile header contract", () => {
  it("shows a back arrow on My Profile even without navigation history", () => {
    expect(profile).toContain('title="Моят профил"');
    expect(profile).toContain("forceBackIcon");
    expect(header).toContain("const usesBackIcon = canGoBack || forceBackIcon");
    expect(header).toContain('name={usesBackIcon ? "chevron-left" : "home"}');
  });
});
