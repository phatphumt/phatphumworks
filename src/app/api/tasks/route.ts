import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { taskCreateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = taskCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const row = {
    id: crypto.randomUUID(),
    title: input.title,
    notes: input.notes ?? "",
    subjectCode: input.subjectCode ?? null,
    dueDate: input.dueDate,
    priority: input.priority ?? "normal",
    createdAt: new Date(),
  };

  await db.insert(tasks).values(row);
  return NextResponse.json({ task: row }, { status: 201 });
}
