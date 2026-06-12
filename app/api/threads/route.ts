import { NextResponse } from "next/server";
import { getClientId } from "@/lib/client-id";
import { ensureThread, listThreads } from "@/lib/persistence";

// List all (non-archived + archived) threads for the current client.
export async function GET() {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ threads: [] });
  const threads = await listThreads(clientId);
  return NextResponse.json({ threads });
}

// Create / ensure a thread.
export async function POST(req: Request) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { threadId, model }: { threadId: string; model?: string } = await req.json();
  if (!threadId) {
    return NextResponse.json({ error: "threadId required" }, { status: 400 });
  }
  await ensureThread(threadId, clientId, model);
  return NextResponse.json({ ok: true, threadId });
}
