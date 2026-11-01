#!/usr/bin/env node
/**
 * Seeds the local database with the example timetable and a few tasks.
 * Idempotent: lessons are replaced, tasks are only inserted when empty.
 *
 * Usage: node scripts/seed.mjs
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function readEnv(file) {
  try {
    const raw = readFileSync(file, "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...readEnv(join(here, "..", ".env.local")), ...process.env };
const client = createClient({
  url: env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: env.TURSO_AUTH_TOKEN || undefined,
});

const schedule = JSON.parse(
  readFileSync(join(here, "..", "data", "schedule.example.json"), "utf8"),
);

await client.execute("DELETE FROM lessons");
for (const lesson of schedule.lessons) {
  await client.execute({
    sql: `INSERT INTO lessons (day_of_week, period, subject_code, subject_name)
          VALUES (?, ?, ?, ?)`,
    args: [lesson.dayOfWeek, lesson.period, lesson.subjectCode, lesson.subjectName],
  });
}

await client.execute({
  sql: `INSERT INTO settings (key, value) VALUES ('periodTimes', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  args: [JSON.stringify(schedule.periodTimes)],
});
await client.execute({
  sql: `INSERT INTO settings (key, value) VALUES ('digestTime', '18:00')
        ON CONFLICT(key) DO NOTHING`,
  args: [],
});
await client.execute({
  sql: `INSERT INTO settings (key, value) VALUES ('windowDays', '7')
        ON CONFLICT(key) DO NOTHING`,
  args: [],
});

const { rows } = await client.execute("SELECT COUNT(*) AS n FROM tasks");
if (Number(rows[0].n) === 0) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const shift = (days) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const seedTasks = [
    ["การบ้านบทที่ 4 (ฟังก์ชัน)", "ทำข้อ 1-12 ในแบบฝึกหัด", "ค32101", shift(0), "high"],
    ["รายงานแล็บเคมี", "สรุปผลการทดลอง + กราฟ", "ว32102", shift(1), "normal"],
    ["อ่านบทที่ 7 วรรณคดี", "", "ท32101", shift(3), "normal"],
    ["บันทึกการอ่าน", "ส่งครูผู้สอน", "ท32101", shift(-2), "normal"],
    ["แบบฝึกหัดฟิสิกส์ อินเตอร์เฟอเรนซ์", "", "ว32101", shift(6), "low"],
  ];

  for (const [title, notes, subjectCode, dueDate, priority] of seedTasks) {
    await client.execute({
      sql: `INSERT INTO tasks (id, title, notes, subject_code, due_date, priority, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        crypto.randomUUID(),
        title,
        notes,
        subjectCode,
        dueDate,
        priority,
        Date.now(),
      ],
    });
  }

  await client.execute({
    sql: `INSERT INTO tasks (id, title, notes, subject_code, due_date, priority, done_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      "ทบทวนคำศัพท์ Unit 3",
      "",
      "อ32101",
      shift(-1),
      "low",
      Date.now() - 86_400_000,
      Date.now() - 2 * 86_400_000,
    ],
  });
}

const lessons = await client.execute("SELECT COUNT(*) AS n FROM lessons");
const tasks = await client.execute("SELECT COUNT(*) AS n FROM tasks");
console.log(`seeded: ${lessons.rows[0].n} lessons, ${tasks.rows[0].n} tasks`);
client.close();
