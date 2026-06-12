"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { usePostgresThreadListAdapter } from "@/lib/thread-list-adapter";
import { getActiveModel } from "@/lib/model-store";

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
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { ModelPicker } from "@/components/assistant-ui/model-picker";
import { ConversationTitle } from "@/components/assistant-ui/conversation-title";
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
          // Attach the active model to every request. Read at call time so
          // mid-chat switches apply to the next turn.
          body: () => ({ model: getActiveModel() }),
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
              <SidebarTrigger className="shrink-0" />
              <Separator orientation="vertical" className="mr-1 h-4 shrink-0" />
              {/* Brand: hidden on mobile (the sidebar already shows it) to make
                  room for the conversation title; visible from sm up. */}
              <span className="hidden shrink-0 font-semibold sm:inline">Nomadsoft AI</span>
              <Separator orientation="vertical" className="mr-1 hidden h-4 shrink-0 sm:block" />
              {/* Conversation title takes the flexible middle space and
                  truncates so it never collides with the brand or picker. */}
              <div className="flex min-w-0 flex-1 items-center">
                <ConversationTitle />
              </div>
              <div className="ml-2 shrink-0">
                <ModelPicker />
              </div>
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
