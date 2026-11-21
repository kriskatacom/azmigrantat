import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const uploadScreen = readFileSync("../src/app/videos/upload.tsx", "utf8");

describe("required video title with keywords presentation", () => {
  it("keeps the title field visually labelled as required keywords", () => {
    expect(uploadScreen).toContain('label="Ключови думи (задължително)"');
    expect(uploadScreen).toContain('label: "Ключови думи"');
    expect(uploadScreen).toContain("value={title}");
  });

  it("blocks forward navigation and upload when the title value is empty", () => {
    expect(uploadScreen).toContain(
      "nextStep > currentStep && currentStep === 1 && !title.trim()",
    );
    expect(uploadScreen).toContain("if (!title.trim()) {");
    expect(uploadScreen).toContain("Полето „Ключови думи“ е задължително.");
    expect(uploadScreen).toContain("error={titleError ?? undefined}");
  });
});
