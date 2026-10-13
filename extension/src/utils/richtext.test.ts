import { describe, expect, it } from "vitest";
import { parseBlocks, parseInline } from "./richtext";

describe("parseInline", () => {
  it("handles emphasis, strong and code", () => {
    expect(parseInline("a *b* **c** `d` e")).toEqual([
      { t: "text", v: "a " },
      { t: "em", v: "b" },
      { t: "text", v: " " },
      { t: "strong", v: "c" },
      { t: "text", v: " " },
      { t: "code", v: "d" },
      { t: "text", v: " e" },
    ]);
  });
  it("does not treat spaced asterisks (multiplication) as emphasis", () => {
    expect(parseInline("2 * 3 * 4")).toEqual([{ t: "text", v: "2 * 3 * 4" }]);
  });
  it("leaves HTML as plain text for React to escape", () => {
    expect(parseInline("<img src=x onerror=alert(1)>")).toEqual([
      { t: "text", v: "<img src=x onerror=alert(1)>" },
    ]);
  });
});

describe("parseBlocks", () => {
  it("splits paragraphs, lists and fenced code", () => {
    const blocks = parseBlocks("First line\ncontinues.\n\n- one\n- two\n\n1. a\n2. b\n\n```\nx = 1\ny = 2\n```\n\nEnd");
    expect(blocks.map((b) => b.t)).toEqual(["p", "ul", "ol", "code", "p"]);
    expect(blocks[0]).toMatchObject({ t: "p", inline: [{ t: "text", v: "First line continues." }] });
    expect(blocks[1]).toMatchObject({ t: "ul" });
    expect((blocks[1] as { items: unknown[] }).items).toHaveLength(2);
    expect(blocks[3]).toEqual({ t: "code", text: "x = 1\ny = 2" });
  });
  it("tolerates an unterminated fence", () => {
    expect(parseBlocks("```\nabc")).toEqual([{ t: "code", text: "abc" }]);
  });
});
