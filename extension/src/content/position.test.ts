import { describe, expect, it } from "vitest";
import { clampRectToViewport, scrollDeltaForPanel } from "./position";

describe("clampRectToViewport", () => {
  it("clips a selection taller than the viewport to its visible part", () => {
    const r = clampRectToViewport(
      { x: 100, y: -300, width: 400, height: 2000, top: -300, left: 100, right: 500, bottom: 1700 },
      1200,
      800,
    );
    expect(r.top).toBe(0);
    expect(r.bottom).toBe(800);
    expect(r.left).toBe(100);
    expect(r.width).toBe(400);
  });

  it("leaves a fully off-screen selection alone so the card scrolls away with it", () => {
    const r = clampRectToViewport(
      { x: 0, y: -500, width: 50, height: 20, top: -500, left: 0, right: 50, bottom: -480 },
      1200,
      800,
    );
    expect(r.top).toBe(-500);
  });

  it("is a no-op for a normal on-screen selection", () => {
    const r = clampRectToViewport(
      { x: 200, y: 300, width: 120, height: 20, top: 300, left: 200, right: 320, bottom: 320 },
      1200,
      800,
    );
    expect([r.left, r.top, r.width, r.height]).toEqual([200, 300, 120, 20]);
  });
});

describe("scrollDeltaForPanel", () => {
  it("does nothing when there is already room below", () => {
    expect(scrollDeltaForPanel({ top: 100, bottom: 120 }, 800, 500, 10, 12)).toBe(0);
  });

  it("scrolls just enough to open up the room needed", () => {
    // space below = 800 - 440 - 10 - 12 = 338; need 560 => scroll 222
    expect(scrollDeltaForPanel({ top: 420, bottom: 440 }, 800, 560, 10, 12)).toBe(222);
  });

  it("never pushes the selection's first line off the top", () => {
    expect(scrollDeltaForPanel({ top: 60, bottom: 700 }, 800, 560, 10, 12)).toBe(48);
  });
});
