import { sql, type ThreadRow } from "@/lib/db";

/**
 * Ensure a thread exists for the given client. If it does not exist it is
 * created. Touches updated_at otherwise.
 */
export async function ensureThread(
  threadId: string,
  clientId: string,
): Promise<void> {
  await sql`
    INSERT INTO threads (id, client_id)
    VALUES (${threadId}, ${clientId})
    ON CONFLICT (id) DO UPDATE SET updated_at = now()
  `;
}

export async function listThreads(clientId: string): Promise<ThreadRow[]> {
  return (await sql`
    SELECT id, client_id, title, created_at, updated_at, archived
    FROM threads
    WHERE client_id = ${clientId} AND archived = false
    ORDER BY updated_at DESC
    LIMIT 200
  `) as unknown as ThreadRow[];
}

export async function archiveThread(
  threadId: string,
  clientId: string,
): Promise<void> {
  await sql`
    UPDATE threads SET archived = true
    WHERE id = ${threadId} AND client_id = ${clientId}
  `;
}

export async function deleteThread(
  threadId: string,
  clientId: string,
): Promise<void> {
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
