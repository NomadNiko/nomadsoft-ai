import { NextResponse } from "next/server";
import { getClientId } from "@/lib/client-id";
import {
  archiveThread,
  unarchiveThread,
  deleteThread,
  renameThread,
  setThreadModel,
  getThread,
} from "@/lib/persistence";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ thread: null }, { status: 404 });
  const { id } = await params;
  const thread = await getThread(id, clientId);
  if (!thread) return NextResponse.json({ thread: null }, { status: 404 });
  return NextResponse.json({ thread });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { id } = await params;
  const body: { title?: string; archived?: boolean; model?: string } = await req.json();
  if (body.archived === true) await archiveThread(id, clientId);
  if (body.archived === false) await unarchiveThread(id, clientId);
  if (typeof body.title === "string") await renameThread(id, clientId, body.title);
  if (typeof body.model === "string") await setThreadModel(id, clientId, body.model);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { id } = await params;
  await deleteThread(id, clientId);
  return NextResponse.json({ ok: true });
}
