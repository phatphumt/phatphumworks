import type { Task } from "./db/schema";
import { addDaysISO, formatThaiDate, formatThaiDateLong } from "./time";

const MAX_ITEMS = 20;
const MAX_FIELD_CHARS = 1000;

export type Digest = {
  count: number;
  payload: {
    username: string;
    embeds: {
      title: string;
      color: number;
      url?: string;
      fields: { name: string; value: string; inline: boolean }[];
      footer?: { text: string };
      timestamp: string;
    }[];
  };
};

function line(task: Task, showDate: boolean): string {
  const code = task.subjectCode ? ` · ${task.subjectCode}` : "";
  const date = showDate ? ` · ${formatThaiDate(task.dueDate)}` : "";
  const flag = task.priority === "high" ? " ⚑" : "";
  return `• ${task.title}${code}${date}${flag}`;
}

/**
 * Pure builder so the digest can be previewed without touching Discord.
 * Returns null when there is nothing worth sending.
 */
export function buildDigest(tasks: Task[], today: string): Digest | null {
  if (tasks.length === 0) return null;

  const overdue = tasks
    .filter((task) => task.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const upcoming = tasks
    .filter((task) => task.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const byDate = new Map<string, Task[]>();
  for (const task of upcoming) {
    const bucket = byDate.get(task.dueDate) ?? [];
    bucket.push(task);
    byDate.set(task.dueDate, bucket);
  }

  const sections: { label: string; tasks: Task[]; showDate: boolean }[] = [];

  for (const [date, items] of [...byDate.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const label =
      date === today
        ? "วันนี้"
        : date === addDaysISO(today, 1)
          ? "พรุ่งนี้"
          : `${formatThaiDate(date)} · ${new Intl.DateTimeFormat("th-TH-u-ca-gregory", { timeZone: "UTC", weekday: "short" }).format(new Date(`${date}T12:00:00Z`))}`;
    sections.push({ label, tasks: items, showDate: false });
  }

  if (overdue.length > 0) {
    sections.push({ label: "เกินกำหนด", tasks: overdue, showDate: true });
  }

  let remaining = MAX_ITEMS;
  const fields: Digest["payload"]["embeds"][number]["fields"] = [];

  for (const section of sections) {
    if (remaining <= 0) break;
    const items = section.tasks.slice(0, remaining);
    remaining -= items.length;

    let value = items.map((task) => line(task, section.showDate)).join("\n");
    if (value.length > MAX_FIELD_CHARS) {
      value = `${value.slice(0, MAX_FIELD_CHARS - 1)}…`;
    }

    fields.push({
      name: `${section.label} (${section.tasks.length})`,
      value,
      inline: false,
    });
  }

  const total = tasks.length;
  if (remaining <= 0 && total > MAX_ITEMS) {
    const last = fields[fields.length - 1];
    last.value += `\n…และอีก ${total - MAX_ITEMS} รายการ`;
  }

  return {
    count: total,
    payload: {
      username: "witcom work notifier",
      embeds: [
        {
          title: `📚 สรุปงาน · ${formatThaiDateLong(today)}`,
          color: 0x0d9488,
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };
}
