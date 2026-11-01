import { notFound } from "next/navigation";
import { getLessons, getTask } from "@/lib/data";
import { todayISO } from "@/lib/time";
import { TaskDetail } from "@/components/tasks/task-detail";

export const dynamic = "force-dynamic";

export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, lessons] = await Promise.all([getTask(id), getLessons()]);

  if (!task) notFound();

  const byCode = new Map<string, string>();
  for (const lesson of lessons) {
    byCode.set(lesson.subjectCode, lesson.subjectName);
  }
  const subjects = [...byCode.entries()]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <TaskDetail task={task} subjects={subjects} today={todayISO()} />
  );
}
