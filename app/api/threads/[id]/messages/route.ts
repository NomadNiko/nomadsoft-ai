import { NextResponse } from "next/server";
import { getClientId } from "@/lib/client-id";
import { sql } from "@/lib/db";

// GET: return all persisted messages for a thread in storage-format shape.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ messages: [], headId: null });
  const { id } = await params;

  const rows = (await sql`
    SELECT m.parts
    FROM messages m
    JOIN threads t ON t.id = m.thread_id
    WHERE m.thread_id = ${id} AND t.client_id = ${clientId}
    ORDER BY m.created_at ASC, m.id ASC
  `) as unknown as {
    parts: {
      id: string;
      parent_id: string | null;
      format: string;
      content: Record<string, unknown>;
    };
  }[];

  const messages = rows.map((r) => r.parts);
  const headId = messages.length ? messages[messages.length - 1].id : null;
  return NextResponse.json({ messages, headId });
}

// POST: append a single formatted message entry to the thread.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "no client id" }, { status: 400 });
  }
  const { id } = await params;
  const entry = (await req.json()) as {
    id: string;
    parent_id: string | null;
    format: string;
    content: Record<string, unknown>;
  };

  await sql`
    INSERT INTO threads (id, client_id)
    VALUES (${id}, ${clientId})
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
  `;

  await sql`
    INSERT INTO messages (thread_id, role, parts)
    VALUES (
      ${id},
      ${(entry.content?.role as string) ?? "unknown"},
      ${sql.json(entry as unknown as Record<string, never>)}
    )
  `;
  await sql`UPDATE threads SET updated_at = now() WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
