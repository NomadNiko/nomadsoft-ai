import { NextResponse } from "next/server";
import { getClientId } from "@/lib/client-id";
import { archiveThread, deleteThread, renameThread } from "@/lib/persistence";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { id } = await params;
  const body: { title?: string; archived?: boolean } = await req.json();
  if (body.archived === true) {
    await archiveThread(id, clientId);
  }
  if (typeof body.title === "string") {
    await renameThread(id, clientId, body.title);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { id } = await params;
  await deleteThread(id, clientId);
  return NextResponse.json({ ok: true });
}
