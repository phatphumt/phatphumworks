import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { digestLog, tasks } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Danger zone: removes every task and digest history, keeps the timetable. */
export async function DELETE() {
  await db.delete(tasks);
  await db.delete(digestLog);
  return NextResponse.json({ ok: true });
}
