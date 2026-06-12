import { NextResponse } from "next/server";
import { getClientId } from "@/lib/client-id";
import { sql } from "@/lib/db";
import { generateConversationTitle } from "@/lib/title";

// GET: return all persisted messages for a thread in storage-format shape.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  // On the first user message, generate a short unique title via Nova Micro.
  // Only do this if the thread has no title yet (race-safe: the UPDATE guards
  // on title IS NULL/empty). Falls back to the truncated question text if the
  // model call fails or returns nothing, so a thread is never left untitled.
  if ((entry.content?.role as string) === "user") {
    const question = extractText(entry.content);
    if (question) {
      // Only spend a model call when the thread still needs a title.
      const existing = (await sql`
        SELECT title FROM threads WHERE id = ${id} LIMIT 1
      `) as unknown as { title: string | null }[];
      const needsTitle = !existing[0]?.title;

      if (needsTitle) {
        const generated = await generateConversationTitle(question);
        const title = (generated ?? question.slice(0, 30)).trim();
        if (title) {
          await sql`
            UPDATE threads SET title = ${title}
            WHERE id = ${id} AND (title IS NULL OR title = '')
          `;
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

// Best-effort extraction of plain text from a stored aui/v0 message content.
function extractText(content: Record<string, unknown> | undefined): string {
  if (!content) return "";
  const parts = (content.content ?? content.parts) as
    | { type?: string; text?: string }[]
    | undefined;
  if (Array.isArray(parts)) {
    return parts
      .filter((p) => p?.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join(" ")
      .trim();
  }
  if (typeof content.text === "string") return content.text.trim();
  return "";
}
