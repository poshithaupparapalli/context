import { describe, expect, it } from "vitest";
import { excerptAround, isMeaningfulSelection, normalizeText, truncate, windowAround } from "./text";

describe("isMeaningfulSelection", () => {
  it.each([
    ["The Brothers Karamazov", true],
    ["Kierkegaard", true],
    ["Ж", false],
    ["  ", false],
    ["...", false],
    ["42", true],
    ["日本語", true],
    ["a", false],
  ])("%j -> %s", (text, expected) => {
    expect(isMeaningfulSelection(text)).toBe(expected);
  });
});

describe("normalizeText / truncate", () => {
  it("collapses whitespace", () => {
    expect(normalizeText("  a \n\t b  ")).toBe("a b");
  });
  it("truncates with an ellipsis within the limit", () => {
    const out = truncate("abcdefghij", 6);
    expect(out).toBe("abcde…");
    expect(out.length).toBe(6);
    expect(truncate("short", 10)).toBe("short");
  });
});

describe("windowAround", () => {
  const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
  it("returns short text untouched", () => {
    expect(windowAround("tiny text", 0, 4, 100)).toBe("tiny text");
  });
  it("keeps the selection inside the window and respects the limit", () => {
    const start = text.indexOf("word200");
    const out = windowAround(text, start, 7, 300);
    expect(out).toContain("word200");
    expect(out.length).toBeLessThanOrEqual(302);
    expect(out.startsWith("…")).toBe(true);
    expect(out.endsWith("…")).toBe(true);
  });
  it("handles a selection at the very start", () => {
    const out = windowAround(text, 0, 5, 200);
    expect(out.startsWith("word0")).toBe(true);
  });
});

describe("excerptAround", () => {
  it("splits the paragraph around the selection", () => {
    const e = excerptAround("I read The Brothers Karamazov at nineteen.", "The Brothers Karamazov");
    expect(e).toEqual({ before: "I read ", match: "The Brothers Karamazov", after: " at nineteen." });
  });
  it("returns null when the selection is not in the paragraph", () => {
    expect(excerptAround("nothing", "missing")).toBeNull();
  });
});
