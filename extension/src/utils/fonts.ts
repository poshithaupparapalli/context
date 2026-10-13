/**
 * Fonts ship inside the extension. They are registered through the FontFace
 * API from raw bytes, which keeps working on pages whose Content-Security-Policy
 * would block a normal @font-face rule. Family names are prefixed so they can
 * never collide with fonts the page defines.
 */

interface FontSpec {
  family: string;
  file: string;
  weight: string;
  style: string;
  range?: string;
}

const LATIN =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT =
  "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

export const FONT_SPECS: FontSpec[] = [
  { family: "Context Serif", file: "instrument-serif-latin-400-normal", weight: "400", style: "normal", range: LATIN },
  { family: "Context Serif", file: "instrument-serif-latin-400-italic", weight: "400", style: "italic", range: LATIN },
  { family: "Context Serif", file: "instrument-serif-latin-ext-400-normal", weight: "400", style: "normal", range: LATIN_EXT },
  { family: "Context Serif", file: "instrument-serif-latin-ext-400-italic", weight: "400", style: "italic", range: LATIN_EXT },
  { family: "Context Sans", file: "dm-sans-latin-wght-normal", weight: "100 1000", style: "normal", range: LATIN },
  { family: "Context Sans", file: "dm-sans-latin-wght-italic", weight: "100 1000", style: "italic", range: LATIN },
  { family: "Context Sans", file: "dm-sans-latin-ext-wght-normal", weight: "100 1000", style: "normal", range: LATIN_EXT },
  { family: "Context Mono", file: "ibm-plex-mono-latin-400-normal", weight: "400", style: "normal", range: LATIN },
  { family: "Context Mono", file: "ibm-plex-mono-latin-500-normal", weight: "500", style: "normal", range: LATIN },
  { family: "Context Mono", file: "ibm-plex-mono-latin-ext-400-normal", weight: "400", style: "normal", range: LATIN_EXT },
];

let loading: Promise<void> | null = null;

export function loadFonts(doc: Document = document): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    await Promise.all(
      FONT_SPECS.map(async (spec) => {
        try {
          const res = await fetch(chrome.runtime.getURL(`fonts/${spec.file}.woff2`));
          if (!res.ok) return;
          const face = new FontFace(spec.family, await res.arrayBuffer(), {
            weight: spec.weight,
            style: spec.style,
            unicodeRange: spec.range,
          });
          await face.load();
          doc.fonts.add(face);
        } catch {
          /* Falls back to the system fonts named in the stack. */
        }
      }),
    );
  })();
  return loading;
}
