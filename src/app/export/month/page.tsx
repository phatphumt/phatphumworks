import type { Metadata } from "next";
import { getAllTasks } from "@/lib/data";
import { todayISO } from "@/lib/time";
import { MonthlyExport } from "@/components/export/monthly-export";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ส่งออกงาน · งานของฉัน",
};

export default async function ExportMonthPage() {
  const tasks = await getAllTasks();
  const today = todayISO();

  return <MonthlyExport tasks={tasks} today={today} />;
}
