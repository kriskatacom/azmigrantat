import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("../package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

describe("Android development commands", () => {
  it("starts Metro for the installed development build without rebuilding", () => {
    const command = packageJson.scripts?.["android:dev"] ?? "";

    expect(command).toContain("expo start");
    expect(command).toContain("--dev-client");
    expect(command).toContain("--android");
    expect(command).toContain("--port 8081");
    expect(command).not.toContain("run:android");
  });

  it("keeps native rebuilding as an explicit separate command", () => {
    expect(packageJson.scripts?.["android:rebuild"]).toBe(
      "expo run:android --device --port 8081",
    );
  });
});
