import { describe, expect, it } from "vitest";
import { getUserDisplayName } from "../../../src/utils/user-display-name";

describe("user display name", () => {
  it("never renders null or zero placeholders as a person's name", () => {
    expect(getUserDisplayName({
      firstName: "null",
      lastName: "null",
      name: "0 0",
      email: "tester@example.com",
    })).toBe("tester");
  });

  it("prefers real profile names and falls back safely", () => {
    expect(getUserDisplayName({
      firstName: "Иван",
      lastName: "Иванов",
      email: "tester@example.com",
    })).toBe("Иван Иванов");

    expect(getUserDisplayName({
      firstName: null,
      lastName: null,
      name: "Google User",
    })).toBe("Google User");

    expect(getUserDisplayName({})).toBe("Потребител");
  });
});
