import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/** One recurring lesson. `(dayOfWeek, period)` is the natural key. */
export const lessons = sqliteTable(
  "lessons",
  {
    dayOfWeek: integer("day_of_week").notNull(), // 1 = จันทร์ … 7 = อาทิตย์
    period: integer("period").notNull(), // 1..10
    subjectCode: text("subject_code").notNull(),
    subjectName: text("subject_name").notNull(),
  },
  (table) => [primaryKey({ columns: [table.dayOfWeek, table.period] })],
);

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    subjectCode: text("subject_code"),
    /** YYYY-MM-DD in Asia/Bangkok. A date is a label, not an instant. */
    dueDate: text("due_date").notNull(),
    priority: text("priority", { enum: ["low", "normal", "high"] })
      .notNull()
      .default("normal"),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
    /** Set 7 days after completion by the cron job; hides the row for good. */
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("tasks_due_date_idx").on(table.dueDate),
    index("tasks_done_at_idx").on(table.doneAt),
  ],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

/** One row per day the digest was attempted — the idempotency lock. */
export const digestLog = sqliteTable("digest_log", {
  date: text("date").primaryKey(),
  sentAt: integer("sent_at", { mode: "timestamp_ms" }),
  itemCount: integer("item_count").notNull().default(0),
  error: text("error"),
});

/** Web Push subscriptions, one row per device. */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  endpoint: text("endpoint").primaryKey(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Idempotency lock for per-period push notifications. */
export const pushLog = sqliteTable(
  "push_log",
  {
    date: text("date").notNull(),
    period: integer("period").notNull(),
    sentAt: integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [primaryKey({ columns: [table.date, table.period] })],
);

export type Lesson = typeof lessons.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type DigestLog = typeof digestLog.$inferSelect;

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type PushLog = typeof pushLog.$inferSelect;
