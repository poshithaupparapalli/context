/**
 * Everything is sized in px (not rem) on purpose: the content script runs on
 * arbitrary websites, and some of them set a root font-size that would make
 * rem-based UI grow or shrink.
 */
const spacingKeys = [
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44,
  48, 52, 56, 60, 64, 72, 80, 96,
];
const spacing = Object.fromEntries(spacingKeys.map((k) => [String(k), `${k * 4}px`]));
spacing.px = "1px";

const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}", "./options.html"],
  corePlugins: { container: false },
  theme: {
    spacing,
    borderRadius: { none: "0", sm: "2px", DEFAULT: "2px", md: "3px", full: "9999px" },
    fontSize: {
      "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.09em" }],
      xs: ["11px", { lineHeight: "16px", letterSpacing: "0.07em" }],
      sm: ["13px", "19px"],
      base: ["14.5px", "23px"],
      md: ["15.5px", "25px"],
      lg: ["18px", "25px"],
      xl: ["22px", "26px"],
      "2xl": ["30px", "31px"],
      "3xl": ["38px", "38px"],
    },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      paper: channel("paper"),
      "paper-2": channel("paper-2"),
      ink: channel("ink"),
      "ink-2": channel("ink-2"),
      line: channel("line"),
      cobalt: channel("cobalt"),
      plate: channel("plate"),
      "plate-ink": channel("plate-ink"),
      mist: channel("mist"),
    },
    fontFamily: {
      serif: ['"Context Serif"', '"Instrument Serif"', "Georgia", '"Times New Roman"', "serif"],
      sans: ['"Context Sans"', '"DM Sans"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      mono: ['"Context Mono"', '"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    },
    extend: {
      keyframes: {
        "ctx-sweep": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(260%)" },
        },
        "ctx-rise": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "ctx-fade": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
      },
      animation: {
        sweep: "ctx-sweep 1.4s cubic-bezier(.4,0,.2,1) infinite",
        rise: "ctx-rise 180ms cubic-bezier(.2,.7,.2,1) both",
        fade: "ctx-fade 160ms ease-out both",
      },
    },
  },
  plugins: [],
};
