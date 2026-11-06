import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("../src/app/index.tsx", "utf8");
const buttonImagePath = "../assets/images/see-more-button-outline.png";
const logoImagePath = "../assets/images/logo-transparent.png";

describe("home see-more button", () => {
  it("uses the supplied image and keeps the existing categories route", () => {
    expect(existsSync(buttonImagePath)).toBe(true);
    expect(home).toContain(
      'require("../../assets/images/see-more-button-outline.png")',
    );
    expect(home).toContain('router.push("/main-categories")');
  });

  it("retains an accessible button label", () => {
    expect(home).toContain('accessibilityLabel="Виж повече"');
  });

  it("uses the transparent application logo", () => {
    expect(existsSync(logoImagePath)).toBe(true);
    expect(home).toContain(
      'require("../../assets/images/logo-transparent.png")',
    );
  });
});
