import { cookies } from "next/headers";

export const CLIENT_ID_COOKIE = "agent_client_id";

/**
 * Reads the per-browser client id from cookies. This scopes persisted
 * threads to a browser/device. NOTE: this is not authentication. Anyone
 * with the client id (or who reaches the server) could access those
 * threads. Add real auth before exposing sensitive data.
 */
export async function getClientId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CLIENT_ID_COOKIE)?.value ?? null;
}
