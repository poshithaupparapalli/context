import type { VerifiedSource } from "@context/shared";

const API = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const USER_AGENT = "ContextReadingCompanion/0.1 (personal project; local server)";

export interface WikipediaOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Context never lets the model write URLs. A "further reading" link exists only
 * if Wikipedia confirms an article with that title (following redirects) and it
 * is a real article rather than a disambiguation page.
 */
export function createWikipediaVerifier({ fetchImpl = fetch, timeoutMs = 3500 }: WikipediaOptions = {}) {
  const memo = new Map<string, Promise<VerifiedSource | null>>();

  async function lookup(title: string): Promise<VerifiedSource | null> {
    const slug = encodeURIComponent(title.trim().replace(/\s+/g, "_"));
    try {
      const res = await fetchImpl(`${API}${slug}?redirect=true`, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return null;
      const json: any = await res.json();
      if (json?.type !== "standard") return null;
      const url: unknown = json?.content_urls?.desktop?.page;
      if (typeof url !== "string" || !isWikipediaUrl(url)) return null;
      const resolvedTitle = typeof json.title === "string" ? json.title : title;
      const description = typeof json.description === "string" ? json.description : undefined;
      return { title: resolvedTitle, description, url, source: "Wikipedia" };
    } catch {
      return null;
    }
  }

  return {
    verify(title: string): Promise<VerifiedSource | null> {
      const key = title.trim().toLowerCase();
      let hit = memo.get(key);
      if (!hit) {
        hit = lookup(title);
        memo.set(key, hit);
        // Only successes are worth remembering; a timeout should be retried.
        hit.then((v) => {
          if (!v) memo.delete(key);
        });
        if (memo.size > 300) memo.delete(memo.keys().next().value as string);
      }
      return hit;
    },

    async verifyAll(titles: string[]): Promise<VerifiedSource[]> {
      const results = await Promise.all([...new Set(titles)].map((t) => this.verify(t)));
      const seen = new Set<string>();
      const out: VerifiedSource[] = [];
      for (const r of results) {
        if (r && !seen.has(r.url)) {
          seen.add(r.url);
          out.push(r);
        }
      }
      return out;
    },
  };
}

export type WikipediaVerifier = ReturnType<typeof createWikipediaVerifier>;

export function isWikipediaUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname === "en.wikipedia.org";
  } catch {
    return false;
  }
}
