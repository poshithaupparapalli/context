import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import type { ApiError, HealthResponse } from "@context/shared";
import type { Config } from "./config.js";
import { ContextError } from "./errors.js";
import type { ContextService } from "./services/context-service.js";

export interface AppDeps {
  config: Pick<Config, "provider" | "fastModel" | "deepModel">;
  service: ContextService;
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Only the extension (and local tools) may call this server; web pages may not. */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return origin.startsWith("chrome-extension://") || LOCAL_ORIGIN.test(origin);
}

export function createApp({ config, service }: AppDeps) {
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin)) {
      res.status(403).json(errorBody("bad_request", "Origin not allowed."));
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "content-type");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_req, res) => {
    const body: HealthResponse = {
      ok: true,
      provider: config.provider,
      configured: Boolean(config.provider),
      fastModel: config.fastModel,
      deepModel: config.deepModel,
    };
    res.json(body);
  });

  const route =
    (handler: (body: unknown, signal: AbortSignal) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      const controller = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) controller.abort();
      });
      try {
        res.json(await handler(req.body, controller.signal));
      } catch (err) {
        next(err);
      }
    };

  app.post("/api/explain", route((b, s) => service.explain(b as never, s)));
  app.post("/api/deepen", route((b, s) => service.deepen(b as never, s)));
  app.post("/api/followup", route((b, s) => service.followUp(b as never, s)));

  app.use((_req, res) => {
    res.status(404).json(errorBody("bad_request", "Not found."));
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) return;
    if (err instanceof ContextError) {
      res.status(err.status).json(errorBody(err.code, err.message));
    } else if (err instanceof ZodError) {
      res.status(400).json(errorBody("bad_request", "The request was missing required fields."));
    } else if ((err as { type?: string })?.type === "entity.parse.failed") {
      res.status(400).json(errorBody("bad_request", "Invalid JSON body."));
    } else if ((err as { type?: string })?.type === "entity.too.large") {
      res.status(413).json(errorBody("bad_request", "Request body too large."));
    } else {
      console.error("[context] unexpected error:", err);
      res.status(500).json(errorBody("internal", "Something went wrong on the server."));
    }
  });

  return app;
}

function errorBody(code: ApiError["code"], message: string): { error: ApiError } {
  return { error: { code, message } };
}
