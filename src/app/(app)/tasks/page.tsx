import { getDigestSettings, getLessons, getVisibleTasks } from "@/lib/data";
import { todayISO } from "@/lib/time";
import { TasksView } from "@/components/tasks/tasks-view";
import { FILTERS, type TaskFilter } from "@/lib/group-tasks";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ f?: string }>;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ f }, tasks, lessons, digest] = await Promise.all([
    searchParams,
    getVisibleTasks(),
    getLessons(),
    getDigestSettings(),
  ]);

  const filter: TaskFilter =
    FILTERS.find((option) => option.value === f)?.value ?? "all";

  const byCode = new Map<string, string>();
  for (const lesson of lessons) {
    byCode.set(lesson.subjectCode, lesson.subjectName);
  }
  const subjects = [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <TasksView
      initialTasks={tasks}
      subjects={subjects}
      today={todayISO()}
      digestTime={digest.digestTime}
      initialFilter={filter}
    />
  );
}
