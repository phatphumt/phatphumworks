import { NextResponse } from "next/server";
import { getDigestSettings } from "@/lib/data";
import { postWebhook } from "@/lib/discord";

export const dynamic = "force-dynamic";

/** Powers the "ส่งข้อความทดสอบ" button. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    url?: unknown;
  } | null;

  const settings = await getDigestSettings();
  const url =
    typeof body?.url === "string" && body.url.trim()
      ? body.url.trim()
      : settings.webhookUrl;

  if (!url) {
    return NextResponse.json(
      { ok: false, status: 0, error: "ยังไม่ได้ใส่ webhook URL" },
      { status: 400 },
    );
  }

  const result = await postWebhook(url, {
    username: "งานของฉัน",
    embeds: [
      {
        title: "✅ เชื่อมต่อสำเร็จ",
        description:
          "ข้อความทดสอบจาก **งานของฉัน**\nถ้าคุณเห็นข้อความนี้ สรุปงาน 18:00 จะมาถึงช่องนี้",
        color: 0x0d9488,
        footer: { text: "งานของฉัน · School Tasks" },
        timestamp: new Date().toISOString(),
      },
    ],
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
