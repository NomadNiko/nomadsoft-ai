"use client";

import { useCallback } from "react";
import {
  RuntimeAdapterProvider,
  useThreadListItem,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { createPostgresHistoryAdapter } from "@/lib/history-adapter";
import { getActiveModel } from "@/lib/model-store";

type ThreadRow = {
  id: string;
  title: string | null;
  archived: boolean;
};

/**
 * RemoteThreadListAdapter backed by our local Postgres API.
 * Powers the left-hand thread list (create / list / rename / archive / delete)
 * and injects the per-thread history adapter via unstable_Provider so messages
 * persist and reload per thread.
 */
export function usePostgresThreadListAdapter(): RemoteThreadListAdapter {
  const unstable_Provider = useCallback(function Provider({ children }: React.PropsWithChildren) {
    // Resolve the active thread's persisted id (remoteId, falling back to the
    // local id) so the history adapter reads/writes the correct thread.
    const remoteId = useThreadListItem((i) => i.remoteId);
    const localId = useThreadListItem((i) => i.id);
    const history = createPostgresHistoryAdapter(() => remoteId ?? localId);
    return <RuntimeAdapterProvider adapters={{ history }}>{children}</RuntimeAdapterProvider>;
  }, []);

  return {
    async list() {
      const res = await fetch("/api/threads", { method: "GET" });
      if (!res.ok) return { threads: [] };
      const data = (await res.json()) as { threads: ThreadRow[] };
      return {
        threads: (data.threads ?? []).map((t) => ({
          status: t.archived ? ("archived" as const) : ("regular" as const),
          remoteId: t.id,
          title: t.title ?? undefined,
        })),
      };
    },

    async initialize(threadId: string) {
      await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Persist the currently-selected model as the new thread's model.
        body: JSON.stringify({ threadId, model: getActiveModel() }),
      });
      return { remoteId: threadId, externalId: undefined };
    },

    async rename(remoteId: string, newTitle: string) {
      await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
    },

    async archive(remoteId: string) {
      await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
    },

    async unarchive(remoteId: string) {
      await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
    },

    async delete(remoteId: string) {
      await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, {
        method: "DELETE",
      });
    },

    async fetch(threadId: string) {
      const res = await fetch(`/api/threads/${encodeURIComponent(threadId)}`, {
        method: "GET",
      });
      if (!res.ok) {
        return { status: "regular" as const, remoteId: threadId };
      }
      const { thread } = (await res.json()) as { thread: ThreadRow | null };
      return {
        status: thread?.archived ? ("archived" as const) : ("regular" as const),
        remoteId: threadId,
        title: thread?.title ?? undefined,
      };
    },

    // The title is generated server-side from the first user message (Amazon
    // Nova Micro) when the message is persisted. assistant-ui calls this right
    // after the first run; we fetch the stored title and stream it back so the
    // sidebar updates live (no refresh needed). We briefly poll to cover the
    // race where this fires before the message POST has committed the title.
    async generateTitle(remoteId: string) {
      let title = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          const res = await fetch(`/api/threads/${encodeURIComponent(remoteId)}`, {
            method: "GET",
          });
          if (res.ok) {
            const { thread } = (await res.json()) as {
              thread: { title: string | null } | null;
            };
            if (thread?.title) {
              title = thread.title;
              break;
            }
          }
        } catch {
          // ignore and retry
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      return createAssistantStream((controller) => {
        if (title) controller.appendText(title);
      });
    },

    unstable_Provider,
  };
}
