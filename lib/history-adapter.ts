"use client";

import type {
  ThreadHistoryAdapter,
  ExportedMessageRepositoryItem,
  MessageFormatAdapter,
  MessageFormatItem,
  MessageFormatRepository,
  GenericThreadHistoryAdapter,
} from "@assistant-ui/react";

/**
 * A ThreadHistoryAdapter backed by our local Postgres-backed API.
 *
 * `useChatRuntime` calls `withFormat(formatAdapter)` and uses the returned
 * generic adapter. We use the provided format adapter to encode/decode each
 * message to/from a storage blob persisted in Postgres via /api/threads/:id.
 *
 * Messages are scoped server-side by the `agent_client_id` cookie.
 */
export function createPostgresHistoryAdapter(
  threadId: string,
): ThreadHistoryAdapter {
  const base = `/api/threads/${encodeURIComponent(threadId)}/messages`;

  const withFormat = <
    TMessage,
    TStorageFormat extends Record<string, unknown>,
  >(
    formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>,
  ): GenericThreadHistoryAdapter<TMessage> => {
    return {
      async load(): Promise<MessageFormatRepository<TMessage>> {
        const res = await fetch(base, { method: "GET" });
        if (!res.ok) return { messages: [] };
        const data = (await res.json()) as {
          messages: {
            id: string;
            parent_id: string | null;
            format: string;
            content: TStorageFormat;
          }[];
          headId: string | null;
        };
        const messages = (data.messages ?? [])
          .filter((m) => m.format === formatAdapter.format)
          .map((m) => formatAdapter.decode(m));
        return { messages, headId: data.headId ?? null };
      },

      async append(item: MessageFormatItem<TMessage>): Promise<void> {
        const content = formatAdapter.encode(item);
        const id = formatAdapter.getId(item.message);
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            parent_id: item.parentId,
            format: formatAdapter.format,
            content,
          }),
        });
      },
    };
  };

  return {
    // These are required by the type but unused when withFormat is provided
    // by useChatRuntime; provide safe fallbacks.
    async load() {
      return { messages: [] };
    },
    async append(_item: ExportedMessageRepositoryItem) {
      // no-op; persistence happens via the formatted adapter
    },
    withFormat,
  };
}
