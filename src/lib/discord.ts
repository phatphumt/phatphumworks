export type DiscordResult = {
  ok: boolean;
  status: number;
  error?: string;
};

export function isDiscordWebhook(url: string): boolean {
  return /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(
    url.trim(),
  );
}

/**
 * Never throws. A dead webhook must surface in Settings, not crash a cron run.
 */
export async function postWebhook(
  url: string,
  payload: unknown,
): Promise<DiscordResult> {
  if (!isDiscordWebhook(url)) {
    return {
      ok: false,
      status: 0,
      error: "URL ต้องขึ้นต้นด้วย https://discord.com/api/webhooks/…",
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (response.ok) return { ok: true, status: response.status };

    const raw = await response.text().catch(() => "");
    let message = raw;
    try {
      const parsed = JSON.parse(raw) as { message?: string };
      message = parsed.message ?? raw;
    } catch {
      /* keep raw */
    }

    return {
      ok: false,
      status: response.status,
      error: message.slice(0, 300) || `HTTP ${response.status}`,
    };
  } catch (caught) {
    return {
      ok: false,
      status: 0,
      error: caught instanceof Error ? caught.message : "network error",
    };
  }
}
