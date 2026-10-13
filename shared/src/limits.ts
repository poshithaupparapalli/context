/**
 * Size limits for the page context sent to the model.
 * The extension trims to these before sending; the server clamps again, so a
 * misbehaving client can never push a whole webpage through the model.
 */
export const LIMITS = {
  selection: 600,
  paragraph: 1800,
  neighbor: 700,
  neighborsBefore: 2,
  neighborsAfter: 1,
  articleTitle: 200,
  heading: 160,
  description: 300,
  siteName: 80,
  url: 600,
  question: 1000,
  historyMessages: 10,
  historyMessage: 3000,
  summaryField: 1500,
} as const;

/** Total characters of page text (excluding selection) we ever aim to send. */
export const PAGE_CONTEXT_BUDGET =
  LIMITS.paragraph +
  LIMITS.neighbor * (LIMITS.neighborsBefore + LIMITS.neighborsAfter) +
  LIMITS.articleTitle +
  LIMITS.heading +
  LIMITS.description;
