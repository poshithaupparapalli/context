import { z } from "zod";
import { LIMITS } from "./limits.js";

const clamp = (max: number) =>
  z
    .string()
    .transform((s) => (s.length > max ? s.slice(0, max) : s));

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

/** What the extension captured around the highlighted text. */
export const PageContextSchema = z.object({
  selection: clamp(LIMITS.selection).pipe(z.string().trim().min(1)),
  paragraph: clamp(LIMITS.paragraph).default(""),
  before: z.array(clamp(LIMITS.neighbor)).max(LIMITS.neighborsBefore).default([]),
  after: z.array(clamp(LIMITS.neighbor)).max(LIMITS.neighborsAfter).default([]),
  articleTitle: clamp(LIMITS.articleTitle).default(""),
  heading: clamp(LIMITS.heading).default(""),
  description: clamp(LIMITS.description).default(""),
  siteName: clamp(LIMITS.siteName).default(""),
  url: clamp(LIMITS.url).default(""),
});
export type PageContext = z.infer<typeof PageContextSchema>;

export const ExplainRequestSchema = z.object({ context: PageContextSchema });
export type ExplainRequest = z.input<typeof ExplainRequestSchema>;

/* ------------------------------------------------------------------ */
/* Initial explanation                                                 */
/* ------------------------------------------------------------------ */

export const PassageBasisSchema = z.enum(["stated", "inferred", "unclear"]);
export type PassageBasis = z.infer<typeof PassageBasisSchema>;

export const ExplanationSchema = z.object({
  title: z.string().min(1).max(200),
  labels: z.array(z.string().min(1).max(60)).min(1).max(5),
  whatItIs: z.string().min(1).max(1200),
  inThisPassage: z.string().min(1).max(1400),
  passageBasis: PassageBasisSchema,
  identification: z.enum(["confident", "uncertain"]),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

/* ------------------------------------------------------------------ */
/* Deeper exploration                                                  */
/* ------------------------------------------------------------------ */

export const BlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("paragraph"),
    text: z.string().min(1).max(2600),
    basis: z.enum(["established", "interpretation"]).default("established"),
  }),
  z.object({
    type: z.literal("formula"),
    text: z.string().min(1).max(900),
    caption: z.string().max(400).optional(),
  }),
  z.object({
    type: z.literal("list"),
    items: z.array(z.string().min(1).max(800)).min(1).max(10),
  }),
  z.object({
    type: z.literal("example"),
    text: z.string().min(1).max(1800),
  }),
]);
export type Block = z.infer<typeof BlockSchema>;

export const SectionSchema = z.object({
  heading: z.string().min(1).max(80),
  blocks: z.array(BlockSchema).min(1).max(8),
});
export type Section = z.infer<typeof SectionSchema>;

/** What the model produces. It never produces URLs. */
export const DeepModelOutputSchema = z.object({
  overview: z.string().min(1).max(2200),
  sections: z.array(SectionSchema).min(1).max(6),
  related: z
    .array(z.object({ term: z.string().min(1).max(120), note: z.string().min(1).max(400) }))
    .max(6)
    .default([]),
  wikipediaTitles: z.array(z.string().min(1).max(160)).max(6).default([]),
  originalWorks: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        author: z.string().max(120).optional(),
        year: z.string().max(60).optional(),
      }),
    )
    .max(6)
    .default([]),
});
export type DeepModelOutput = z.infer<typeof DeepModelOutputSchema>;

export const VerifiedSourceSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  url: z.string().url(),
  source: z.literal("Wikipedia"),
});
export type VerifiedSource = z.infer<typeof VerifiedSourceSchema>;

export const DeepResponseSchema = z.object({
  overview: DeepModelOutputSchema.shape.overview,
  sections: DeepModelOutputSchema.shape.sections,
  related: DeepModelOutputSchema.shape.related,
  originalWorks: DeepModelOutputSchema.shape.originalWorks,
  verifiedSources: z.array(VerifiedSourceSchema),
});
export type DeepResponse = z.infer<typeof DeepResponseSchema>;

export const DeepenRequestSchema = z.object({
  context: PageContextSchema,
  explanation: z.object({
    title: clamp(120),
    whatItIs: clamp(LIMITS.summaryField),
    inThisPassage: clamp(LIMITS.summaryField),
  }),
});
export type DeepenRequest = z.input<typeof DeepenRequestSchema>;

/* ------------------------------------------------------------------ */
/* Follow-ups                                                          */
/* ------------------------------------------------------------------ */

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: clamp(LIMITS.historyMessage).pipe(z.string().min(1)),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const FollowUpRequestSchema = z.object({
  context: PageContextSchema,
  explanation: DeepenRequestSchema.shape.explanation,
  overview: clamp(LIMITS.summaryField).default(""),
  history: z.array(ChatMessageSchema).max(LIMITS.historyMessages).default([]),
  question: clamp(LIMITS.question).pipe(z.string().trim().min(1)),
});
export type FollowUpRequest = z.input<typeof FollowUpRequestSchema>;

export const FollowUpResponseSchema = z.object({
  answer: z.string().min(1).max(6000),
});
export type FollowUpResponse = z.infer<typeof FollowUpResponseSchema>;

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export type ApiErrorCode =
  | "not_configured"
  | "bad_request"
  | "timeout"
  | "rate_limited"
  | "upstream"
  | "bad_output"
  | "network"
  | "internal";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export interface HealthResponse {
  ok: true;
  provider: string | null;
  configured: boolean;
  fastModel: string | null;
  deepModel: string | null;
}
