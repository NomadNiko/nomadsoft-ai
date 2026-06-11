import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse a single client across hot reloads / serverless invocations.
const globalForDb = globalThis as unknown as {
  __agentSql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.__agentSql ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__agentSql = sql;
}

export type ThreadRow = {
  id: string;
  client_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  archived: boolean;
};

export type MessageRow = {
  id: string;
  thread_id: string;
  role: string;
  parts: unknown;
  created_at: string;
};
