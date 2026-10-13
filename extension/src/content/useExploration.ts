import type { DeepResponse, Explanation, PageContext } from "@context/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Load } from "../components/types";
import type { Turn } from "../components/Thread";
import { callApi } from "../utils/messages";

/**
 * Everything that happens after a selection becomes a card: the quick
 * explanation, the deeper exploration, and the follow-up thread. One instance
 * per session; state vanishes when the card is closed.
 */
export function useExploration(context: PageContext) {
  const [explain, setExplain] = useState<Load<Explanation>>({ status: "loading" });
  const [deep, setDeep] = useState<Load<DeepResponse>>({ status: "idle" });
  const [turns, setTurns] = useState<Turn[]>([]);

  const alive = useRef(true);
  const nextId = useRef(1);
  const explainRef = useRef<Explanation | null>(null);
  const deepRef = useRef<DeepResponse | null>(null);
  const turnsRef = useRef<Turn[]>([]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const commitTurns = (next: Turn[]) => {
    turnsRef.current = next;
    setTurns(next);
  };

  const runExplain = useCallback(async () => {
    setExplain({ status: "loading" });
    const result = await callApi("explain", { context });
    if (!alive.current) return;
    if (result.ok) {
      explainRef.current = result.data;
      setExplain({ status: "ready", data: result.data });
    } else {
      setExplain({ status: "error", error: result.error });
    }
  }, [context]);

  useEffect(() => {
    void runExplain();
  }, [runExplain]);

  const summary = () => {
    const e = explainRef.current;
    return e ? { title: e.title, whatItIs: e.whatItIs, inThisPassage: e.inThisPassage } : null;
  };

  const runDeep = useCallback(async () => {
    const explanation = summary();
    if (!explanation) return;
    setDeep({ status: "loading" });
    const result = await callApi("deepen", { context, explanation });
    if (!alive.current) return;
    if (result.ok) {
      deepRef.current = result.data;
      setDeep({ status: "ready", data: result.data });
    } else {
      setDeep({ status: "error", error: result.error });
    }
  }, [context]);

  const startDeep = useCallback(() => {
    if (deepRef.current || deep.status === "loading") return;
    void runDeep();
  }, [deep.status, runDeep]);

  const answer = useCallback(
    async (id: number) => {
      const explanation = summary();
      const all = turnsRef.current;
      const index = all.findIndex((t) => t.id === id);
      const turn = all[index];
      if (!explanation || !turn) return;

      const history = all
        .slice(0, index)
        .filter((t) => t.status === "ready" && t.answer)
        .flatMap((t) => [
          { role: "user" as const, content: t.question },
          { role: "assistant" as const, content: t.answer as string },
        ]);

      commitTurns(all.map((t) => (t.id === id ? { ...t, status: "loading", error: undefined } : t)));
      const result = await callApi("followup", {
        context,
        explanation,
        overview: deepRef.current?.overview ?? "",
        history,
        question: turn.question,
      });
      if (!alive.current) return;
      commitTurns(
        turnsRef.current.map((t) =>
          t.id !== id
            ? t
            : result.ok
              ? { ...t, status: "ready", answer: result.data.answer }
              : { ...t, status: "error", error: result.error },
        ),
      );
    },
    [context],
  );

  const ask = useCallback(
    (question: string) => {
      const id = nextId.current++;
      commitTurns([...turnsRef.current, { id, question, status: "loading" }]);
      void answer(id);
    },
    [answer],
  );

  return { explain, deep, turns, retryExplain: runExplain, startDeep, retryDeep: runDeep, ask, retryTurn: answer };
}
