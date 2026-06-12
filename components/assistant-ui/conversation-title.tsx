"use client";

import { useThreadListItem } from "@assistant-ui/react";

/**
 * Shows the active conversation's title in the top bar. Reads from the thread
 * list item so it updates live as the title is generated/renamed (no refresh).
 * Falls back to "New Chat" when the thread has no title yet.
 */
export function ConversationTitle() {
  const title = useThreadListItem((i) => i.title);
  return (
    <span
      className="aui-conversation-title min-w-0 truncate text-sm text-muted-foreground"
      title={title || undefined}
    >
      {title || "New Chat"}
    </span>
  );
}
