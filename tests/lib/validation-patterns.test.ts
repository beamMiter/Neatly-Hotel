import { describe, expect, it } from "vitest";
import { NAME_PATTERN, sanitizeNameInput } from "@/lib/validation-patterns";

describe("sanitizeNameInput", () => {
  it("keeps Latin and Thai names unchanged", () => {
    expect(sanitizeNameInput("John Smith")).toBe("John Smith");
    expect(sanitizeNameInput("Mary-Jane O'Brien")).toBe("Mary-Jane O'Brien");
    expect(sanitizeNameInput("สมชาย ใจดี")).toBe("สมชาย ใจดี");
  });

  it("strips digits and special characters", () => {
    expect(sanitizeNameInput("John123")).toBe("John");
    expect(sanitizeNameInput("J@o#h$n %S^m&i*t(h)!")).toBe("John Smith");
    expect(sanitizeNameInput("สมชาย๑๒๓")).toBe("สมชาย");
  });

  it("strips leading spaces, hyphens and apostrophes", () => {
    expect(sanitizeNameInput("  -'John")).toBe("John");
    expect(sanitizeNameInput("123 John")).toBe("John");
  });

  it("always produces a NAME_PATTERN-valid value when non-empty", () => {
    for (const input of ["1a", "!!Bob", "-Ann", "ก๑ข", "x.y,z"]) {
      const result = sanitizeNameInput(input);
      expect(result === "" || NAME_PATTERN.test(result)).toBe(true);
    }
  });
});
