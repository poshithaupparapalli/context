import { beforeEach, describe, expect, it } from "vitest";
import { LIMITS } from "@context/shared/limits";
import { extractPageContext, findBlock } from "./extract";

function rangeOver(root: Element, text: string): Range {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const i = (node as Text).data.indexOf(text);
    if (i !== -1) {
      const r = document.createRange();
      r.setStart(node, i);
      r.setEnd(node, i + text.length);
      return r;
    }
  }
  throw new Error(`text not found: ${text}`);
}

const longText = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(" ");

beforeEach(() => {
  document.head.innerHTML = `
    <title>Fallback title | Site</title>
    <meta property="og:title" content="On Reading Slowly" />
    <meta property="og:site_name" content="The Quiet Press" />
    <meta name="description" content="An essay about attention." />`;
  document.body.innerHTML = `
    <nav><p>Navigation paragraph that should never be treated as article text.</p></nav>
    <article>
      <h1>On Reading Slowly</h1>
      <p>The first paragraph sets the scene with plenty of words to count as a passage.</p>
      <h2>The long book</h2>
      <p>Second paragraph, quite a long one that also counts as a real passage here.</p>
      <p id="target">When I was nineteen I carried <em id="em">The Brothers Karamazov</em> across three countries and finished it on the way home.</p>
      <p>Fourth paragraph follows afterwards with enough characters to be included.</p>
      <p>Fifth paragraph should not be included because only one follows.</p>
    </article>
    <footer><p>Footer paragraph with enough characters to be a candidate otherwise.</p></footer>`;
});

describe("extractPageContext", () => {
  it("captures selection, paragraph, neighbours, heading and metadata", () => {
    const range = rangeOver(document.getElementById("em")!, "The Brothers Karamazov");
    const { context } = extractPageContext(range, "The Brothers Karamazov");

    expect(context.selection).toBe("The Brothers Karamazov");
    expect(context.paragraph).toContain("When I was nineteen I carried The Brothers Karamazov across three countries");
    expect(context.before).toHaveLength(2);
    expect(context.before[1]).toMatch(/^Second paragraph/);
    expect(context.after).toHaveLength(1);
    expect(context.after[0]).toMatch(/^Fourth paragraph/);
    expect(context.heading).toBe("The long book");
    expect(context.articleTitle).toBe("On Reading Slowly");
    expect(context.siteName).toBe("The Quiet Press");
    expect(context.description).toBe("An essay about attention.");
  });

  it("ignores navigation and footer chrome", () => {
    const range = rangeOver(document.getElementById("em")!, "Karamazov");
    const { context } = extractPageContext(range, "Karamazov");
    const all = [...context.before, ...context.after].join(" ");
    expect(all).not.toContain("Navigation");
    expect(all).not.toContain("Footer");
  });

  it("finds the paragraph even when the selection is inside inline markup", () => {
    const range = rangeOver(document.getElementById("em")!, "Karamazov");
    expect(findBlock(range).id).toBe("target");
  });

  it("drops query strings and fragments from the URL", () => {
    window.history.pushState({}, "", "/essays/slow?token=secret#frag");
    const range = rangeOver(document.getElementById("em")!, "Karamazov");
    const { context } = extractPageContext(range, "Karamazov");
    expect(context.url).not.toContain("secret");
    expect(context.url).not.toContain("#");
    expect(context.url.endsWith("/essays/slow")).toBe(true);
  });

  it("falls back to document.title when there is no og:title", () => {
    document.querySelector("meta[property='og:title']")!.remove();
    const range = rangeOver(document.getElementById("em")!, "Karamazov");
    expect(extractPageContext(range, "Karamazov").context.articleTitle).toBe("Fallback title | Site");
  });

  it("never sends more than the documented limits, even for giant containers", () => {
    document.body.innerHTML = `<div id="giant">${longText(5000)} <span id="sel">the needle phrase</span> ${longText(5000)}</div>`;
    const range = rangeOver(document.getElementById("sel")!, "the needle phrase");
    const { context } = extractPageContext(range, "the needle phrase");
    expect(context.paragraph.length).toBeLessThanOrEqual(LIMITS.paragraph + 2);
    expect(context.paragraph).toContain("the needle phrase");
  });

  it("truncates a very long selection", () => {
    document.body.innerHTML = `<p id="p">${longText(1000)}</p>`;
    const p = document.getElementById("p")!;
    const range = document.createRange();
    range.selectNodeContents(p);
    const { context } = extractPageContext(range, p.textContent ?? "");
    expect(context.selection.length).toBeLessThanOrEqual(LIMITS.selection);
    expect(context.selection.endsWith("…")).toBe(true);
  });
});
