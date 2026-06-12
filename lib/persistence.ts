import { sql, type ThreadRow } from "@/lib/db";
import { DEFAULT_MODEL, isModelKey } from "@/lib/models";

/**
 * Ensure a thread exists for the given client. If it does not exist it is
 * created with the given model (or the default). Touches updated_at otherwise.
 * An existing thread's model is left unchanged here (use setThreadModel).
 */
export async function ensureThread(
  threadId: string,
  clientId: string,
  model?: string,
): Promise<void> {
  const modelKey = isModelKey(model) ? model : DEFAULT_MODEL;
  await sql`
    INSERT INTO threads (id, client_id, model)
    VALUES (${threadId}, ${clientId}, ${modelKey})
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
  `;
}

export async function listThreads(clientId: string): Promise<ThreadRow[]> {
  return (await sql`
    SELECT id, client_id, title, model, created_at, updated_at, archived
    FROM threads
    WHERE client_id = ${clientId}
    ORDER BY updated_at DESC
    LIMIT 200
  `) as unknown as ThreadRow[];
}

export async function getThread(threadId: string, clientId: string): Promise<ThreadRow | null> {
  const rows = (await sql`
    SELECT id, client_id, title, model, created_at, updated_at, archived
    FROM threads
    WHERE id = ${threadId} AND client_id = ${clientId}
    LIMIT 1
  `) as unknown as ThreadRow[];
  return rows[0] ?? null;
}

/** Update the model for a thread (per-thread persisted selection). */
export async function setThreadModel(
  threadId: string,
  clientId: string,
  model: string,
): Promise<void> {
  const modelKey = isModelKey(model) ? model : DEFAULT_MODEL;
  await sql`
    UPDATE threads SET model = ${modelKey}
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}

export async function unarchiveThread(threadId: string, clientId: string): Promise<void> {
  await sql`
    UPDATE threads SET archived = false
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}

export async function archiveThread(threadId: string, clientId: string): Promise<void> {
  await sql`
    UPDATE threads SET archived = true
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}

export async function deleteThread(threadId: string, clientId: string): Promise<void> {
  await sql`
    DELETE FROM threads
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}

export async function renameThread(
  threadId: string,
  clientId: string,
  title: string,
): Promise<void> {
  await sql`
    UPDATE threads SET title = ${title}
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}
