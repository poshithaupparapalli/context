import { describe, expect, it } from "vitest";
import { detectPageTheme, luminance, parseCssColor } from "./color";

describe("parseCssColor", () => {
  it("parses rgb and rgba", () => {
    expect(parseCssColor("rgb(10, 20, 30)")).toEqual({ r: 10, g: 20, b: 30, a: 1 });
    expect(parseCssColor("rgba(10, 20, 30, 0.5)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseCssColor("rgb(10 20 30 / 50%)")).toEqual({ r: 10, g: 20, b: 30, a: 0.5 });
    expect(parseCssColor("transparent")).toBeNull();
  });
});

describe("luminance", () => {
  it("orders black < grey < white", () => {
    const black = luminance({ r: 0, g: 0, b: 0, a: 1 });
    const grey = luminance({ r: 128, g: 128, b: 128, a: 1 });
    const white = luminance({ r: 255, g: 255, b: 255, a: 1 });
    expect(black).toBe(0);
    expect(white).toBeCloseTo(1, 3);
    expect(grey).toBeGreaterThan(black);
    expect(grey).toBeLessThan(white);
  });
});

describe("detectPageTheme", () => {
  it("picks dark for a dark background found on an ancestor", () => {
    document.body.innerHTML = `<main style="background: rgb(17,17,17)"><p id="p">text</p></main>`;
    expect(detectPageTheme(document.getElementById("p"))).toBe("dark");
  });
  it("picks light for a light background", () => {
    document.body.innerHTML = `<main style="background: rgb(250,250,250)"><p id="p">text</p></main>`;
    expect(detectPageTheme(document.getElementById("p"))).toBe("light");
  });
});
