"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { usePostgresThreadListAdapter } from "@/lib/thread-list-adapter";

const CLIENT_ID_COOKIE = "agent_client_id";

/** Stable per-browser client id, mirrored to a cookie for server-side scoping. */
function useClientId(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    let id = window.localStorage.getItem(CLIENT_ID_COOKIE);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(CLIENT_ID_COOKIE, id);
    }
    // Mirror to a cookie so the server (API routes) can read it.
    document.cookie = `${CLIENT_ID_COOKIE}=${id}; path=/; max-age=31536000; samesite=lax`;
    return id;
  }, []);
}
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { Separator } from "@/components/ui/separator";

export const Assistant = () => {
  const clientId = useClientId();
  const threadListAdapter = usePostgresThreadListAdapter();

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function RuntimeHook() {
      return useChatRuntime({
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new AssistantChatTransport({
          api: "/api/chat",
        }),
      });
    },
    adapter: threadListAdapter,
  });

  // Touch clientId so the cookie is set on mount (value used server-side).
  void clientId;

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <ThreadListSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="font-semibold">Nomadsoft AI</span>
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
