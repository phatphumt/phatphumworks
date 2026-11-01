import type { Task } from "@/lib/db/schema";
import { addDaysISO, dayOfWeekISO } from "./time";

export type TaskFilter = "all" | "today" | "week" | "overdue" | "done";

export const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "today", label: "วันนี้" },
  { value: "week", label: "สัปดาห์นี้" },
  { value: "overdue", label: "เกินกำหนด" },
  { value: "done", label: "เสร็จแล้ว" },
];

export type Group = {
  key: string;
  label: string;
  danger?: boolean;
  tasks: Task[];
};

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 } as const;

export function endOfWeekISO(today: string): string {
  return addDaysISO(today, 7 - dayOfWeekISO(today));
}

function compareTasks(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (rank !== 0) return rank;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

export function isDone(task: Task): boolean {
  return task.doneAt !== null;
}

/** Completed work stays visible for 7 days, then the cron job archives it. */
export function recentlyDone(tasks: Task[], today: string): Task[] {
  const cutoff = addDaysISO(today, -7);
  return tasks
    .filter((task) => task.doneAt !== null && task.dueDate >= cutoff)
    .sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0));
}

export function buildGroups(
  tasks: Task[],
  today: string,
  filter: TaskFilter = "all",
  subjectCode: string | null = null,
): Group[] {
  const scoped = subjectCode
    ? tasks.filter((task) => task.subjectCode === subjectCode)
    : tasks;

  const open = scoped
    .filter((task) => !isDone(task))
    .sort(compareTasks)
    .filter((task) => {
      switch (filter) {
        case "today":
          return task.dueDate === today;
        case "week": {
          const end = endOfWeekISO(today);
          return task.dueDate >= today && task.dueDate <= end;
        }
        case "overdue":
          return task.dueDate < today;
        case "done":
          return false;
        default:
          return true;
      }
    });

  if (filter === "done") return [];

  const tomorrow = addDaysISO(today, 1);
  const end = endOfWeekISO(today);

  const overdue = open.filter((task) => task.dueDate < today);
  const dueToday = open.filter((task) => task.dueDate === today);
  const dueTomorrow = open.filter((task) => task.dueDate === tomorrow);
  const thisWeek = open.filter(
    (task) => task.dueDate > tomorrow && task.dueDate <= end,
  );
  const later = open.filter((task) => task.dueDate > end);

  return [
    { key: "overdue", label: "เกินกำหนด", danger: true, tasks: overdue },
    { key: "today", label: "วันนี้", tasks: dueToday },
    { key: "tomorrow", label: "พรุ่งนี้", tasks: dueTomorrow },
    { key: "week", label: "สัปดาห์นี้", tasks: thisWeek },
    { key: "later", label: "ถัดไป", tasks: later },
  ].filter((group) => group.tasks.length > 0);
}

/** Counts shown on the filter chips. */
export function filterCounts(tasks: Task[], today: string) {
  const open = tasks.filter((task) => !isDone(task));
  const end = endOfWeekISO(today);
  return {
    all: open.length,
    today: open.filter((task) => task.dueDate === today).length,
    week: open.filter((task) => task.dueDate >= today && task.dueDate <= end)
      .length,
    overdue: open.filter((task) => task.dueDate < today).length,
    done: recentlyDone(tasks, today).length,
  } satisfies Record<TaskFilter, number>;
}
