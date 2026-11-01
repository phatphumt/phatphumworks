import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function create() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
    authToken: process.env.TURSO_AUTH_TOKEN || undefined,
  });
  return drizzle(client, { schema });
}

// Reuse the connection across HMR reloads and route handlers.
const globalForDb = globalThis as unknown as {
  __schoolTasksDb?: ReturnType<typeof create>;
};

export const db = globalForDb.__schoolTasksDb ?? create();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__schoolTasksDb = db;
}

export { schema };
