import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { getLessons, getPeriodTimes, setSetting } from "@/lib/data";
import { scheduleSchema, uniqueSlotError } from "@/lib/validation";
import { TZ } from "@/lib/time";

/** Export — the same shape the importer accepts, so round-trips are lossless. */
export async function GET() {
  const [rows, periodTimes] = await Promise.all([getLessons(), getPeriodTimes()]);
  return NextResponse.json({
    version: 1,
    timezone: TZ,
    periodTimes,
    lessons: rows.map(({ dayOfWeek, period, subjectCode, subjectName }) => ({
      dayOfWeek,
      period,
      subjectCode,
      subjectName,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  // Accept either a bare array of lessons or the full exported document.
  const normalized = Array.isArray(body) ? { lessons: body } : body;
  const parsed = scheduleSchema.safeParse(normalized);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { lessons: incoming, periodTimes } = parsed.data;
  const duplicate = incoming ? uniqueSlotError(incoming) : null;
  if (duplicate) {
    return NextResponse.json({ error: duplicate }, { status: 400 });
  }

  if (incoming) {
    await db.transaction(async (tx) => {
      await tx.delete(lessons);
      if (incoming && incoming.length > 0) {
        await tx.insert(lessons).values(incoming);
      }
    });
  }

  if (periodTimes) {
    await setSetting("periodTimes", JSON.stringify(periodTimes));
  }

  return NextResponse.json({ ok: true, count: incoming?.length ?? 0 });
}
