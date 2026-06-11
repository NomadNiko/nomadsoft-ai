"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  useChatRuntime,
  AssistantChatTransport,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { createPostgresHistoryAdapter } from "@/lib/history-adapter";

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

/** Stable thread id for this browser session, persisted across reloads. */
function useThreadId(): string {
  return useMemo(() => {
    if (typeof window === "undefined") return "";
    let id = window.localStorage.getItem("agent_thread_id");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("agent_thread_id", id);
    }
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const Assistant = () => {
  const clientId = useClientId();
  const threadId = useThreadId();

  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
    adapters: {
      history: createPostgresHistoryAdapter(threadId || "default"),
    },
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
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink
                      href="https://www.assistant-ui.com/docs/getting-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Build Your Own ChatGPT UX
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Starter Template</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
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
