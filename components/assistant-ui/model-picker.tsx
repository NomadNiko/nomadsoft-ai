"use client";

import { useCallback, useEffect } from "react";
import { useThreadListItem } from "@assistant-ui/react";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { MODELS, MODEL_ORDER, isModelKey, type ModelKey } from "@/lib/models";
import { useModelStore } from "@/lib/model-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Header model picker. Changing the selection:
 *  1. updates the active-model store (so the next chat request uses it), and
 *  2. persists the choice to the active thread (PATCH /api/threads/:id).
 *
 * On thread switch, the store is hydrated from the thread's persisted model.
 *
 * Switching mid-chat is safe: message history is replayed server-side on every
 * request, so only future turns use the new model — context is preserved.
 */
export function ModelPicker() {
  const model = useModelStore((s) => s.model);
  const setModel = useModelStore((s) => s.setModel);
  const hydrate = useModelStore((s) => s.hydrate);

  // Resolve the active thread's persisted id so we can PATCH the choice.
  const remoteId = useThreadListItem((i) => i.remoteId);
  const localId = useThreadListItem((i) => i.id);
  const threadId = remoteId ?? localId;

  // Hydrate the active model from the thread's stored value when the thread
  // changes. New threads (no remoteId yet / no stored model) keep the default.
  useEffect(() => {
    if (!remoteId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, { method: "GET" });
      if (!res.ok || cancelled) return;
      const { thread } = (await res.json()) as {
        thread: { model: string | null } | null;
      };
      if (!cancelled && thread?.model) hydrate(thread.model);
    })();
    return () => {
      cancelled = true;
    };
  }, [remoteId, hydrate]);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (!isModelKey(value)) return;
      setModel(value as ModelKey);
      if (threadId) {
        void fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: value }),
        });
      }
    },
    [setModel, threadId],
  );

  const active = MODELS[model];

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <select
          aria-label="Select model"
          value={model}
          onChange={onChange}
          className="aui-model-picker cursor-pointer appearance-none rounded-md border bg-background py-1 pr-7 pl-2.5 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {MODEL_ORDER.map((key) => (
            <option key={key} value={key}>
              {MODELS[key].label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 opacity-60" />
      </div>
      {active.warning ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              tabIndex={0}
              aria-label={`Warning: ${active.warning}`}
              className="text-amber-500 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
            >
              <TriangleAlert className="size-4" />
            </span>
          </TooltipTrigger>
          <TooltipContent>{active.warning}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
