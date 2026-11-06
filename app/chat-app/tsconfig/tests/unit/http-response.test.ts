import { describe, expect, it } from "vitest";
import { parseJsonResponse } from "../../../src/services/http-response";

describe("parseJsonResponse", () => {
  it("returns a valid JSON response", async () => {
    const response = {
      status: 200,
      text: async () => JSON.stringify({ success: true }),
    };

    await expect(parseJsonResponse(response)).resolves.toEqual({ success: true });
  });

  it("reports the status without leaking an HTML response body", async () => {
    const response = {
      status: 404,
      text: async () => "<!DOCTYPE html><p>signed-url-token=secret</p>",
    };

    let error: unknown;
    try {
      await parseJsonResponse(response, "Видео API върна невалиден отговор.");
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      "Видео API върна невалиден отговор. (HTTP 404)",
    );
    expect((error as Error).message).not.toContain("signed-url-token");
    expect((error as Error).message).not.toContain("<!DOCTYPE");
  });
});
