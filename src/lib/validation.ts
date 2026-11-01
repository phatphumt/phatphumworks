import { z } from "zod";

export const PRIORITIES = ["low", "normal", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ต้องเป็น YYYY-MM-DD");

export const lessonSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  period: z.number().int().min(1).max(10),
  subjectCode: z.string().trim().min(1, "ต้องมีรหัสวิชา").max(20),
  subjectName: z.string().trim().min(1, "ต้องมีชื่อวิชา").max(80),
});

export type LessonInput = z.infer<typeof lessonSchema>;

export const periodTimesSchema = z.record(
  z.string().regex(/^(10|[1-9])$/),
  z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
);

export type PeriodTimes = z.infer<typeof periodTimesSchema>;

export const scheduleSchema = z.object({
  version: z.number().int().optional(),
  timezone: z.string().optional(),
  periodTimes: periodTimesSchema.optional(),
  lessons: z.array(lessonSchema).optional(),
});

export const scheduleInputSchema = z.union([
  scheduleSchema,
  z.array(lessonSchema).transform((lessons) => ({ lessons })),
]);

export function uniqueSlotError(lessons: LessonInput[]): string | null {
  const seen = new Set<string>();
  for (const lesson of lessons) {
    const key = `${lesson.dayOfWeek}:${lesson.period}`;
    if (seen.has(key)) {
      return `มีวิชาซ้ำในช่อง วัน ${lesson.dayOfWeek} คาบ ${lesson.period}`;
    }
    seen.add(key);
  }
  return null;
}

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "ต้องมีชื่องาน").max(120),
  notes: z.string().max(2000).optional().default(""),
  subjectCode: z.string().trim().max(20).nullable().optional().default(null),
  dueDate: isoDate,
  priority: z.enum(PRIORITIES).optional().default("normal"),
});

export const taskPatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  notes: z.string().max(2000).optional(),
  subjectCode: z.string().trim().max(20).nullable().optional(),
  dueDate: isoDate.optional(),
  priority: z.enum(PRIORITIES).optional(),
  done: z.boolean().optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskPatchInput = z.infer<typeof taskPatchSchema>;

/** Kept here so the UI and the importer share one definition of "a week". */
export const DIGEST_WINDOW_DAYS = 7;
export const DIGEST_TIME = "18:00";
