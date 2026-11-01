import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { lessonSchema } from "@/lib/validation";

/** Upsert one cell. */
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = lessonSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const lesson = parsed.data;
  await db
    .insert(lessons)
    .values(lesson)
    .onConflictDoUpdate({
      target: [lessons.dayOfWeek, lessons.period],
      set: { subjectCode: lesson.subjectCode, subjectName: lesson.subjectName },
    });

  return NextResponse.json({ ok: true });
}

/** Clear one cell. */
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const dayOfWeek = Number(searchParams.get("dayOfWeek"));
  const period = Number(searchParams.get("period"));

  if (!dayOfWeek || !period) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  await db
    .delete(lessons)
    .where(
      and(eq(lessons.dayOfWeek, dayOfWeek), eq(lessons.period, period)),
    );

  return NextResponse.json({ ok: true });
}
