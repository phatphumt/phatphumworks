"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileDown,
  Loader2,
  LogOut,
  Send,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useMounted } from "@/lib/use-mounted";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListChevron, ListRow, ListSection, listRowClass } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PeriodTimes } from "@/lib/validation";

type LastLog = {
  date: string;
  sentAt: string | null;
  itemCount: number;
  error: string | null;
};

type Props = {
  initialWebhook: string;
  initialDigestTime: string;
  initialWindowDays: number;
  initialPeriodTimes: PeriodTimes;
  lastLog: LastLog | null;
  nextRunLabel: string;
  appUrl: string | null;
  lessonCount: number;
  taskCount: number;
};

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

type ThemeChoice = "system" | "light" | "dark";

const THEME_OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: "system", label: "ระบบ" },
  { value: "light", label: "สว่าง" },
  { value: "dark", label: "มืด" },
];

const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "ตามระบบ",
  light: "สว่าง",
  dark: "มืด",
};

const timeInputClass =
  "h-11 w-[116px] rounded-[8px] border-0 bg-fill px-2 text-right text-[15px] text-foreground tabular outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SettingsView({
  initialWebhook,
  initialDigestTime,
  initialWindowDays,
  initialPeriodTimes,
  lastLog,
  nextRunLabel,
  appUrl,
  lessonCount,
  taskCount,
}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const isIOS =
    mounted &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !("MSStream" in window);
  const isStandalone =
    mounted &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true);

  const pushSupported =
    mounted &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const [webhook, setWebhook] = useState(initialWebhook);
  const [reveal, setReveal] = useState(false);
  const [digestTime, setDigestTime] = useState(initialDigestTime);
  const [windowDays, setWindowDays] = useState(initialWindowDays);
  const [periodTimes, setPeriodTimes] = useState<PeriodTimes>(initialPeriodTimes);
  const [draftTimes, setDraftTimes] = useState<PeriodTimes>(initialPeriodTimes);
  const [test, setTest] = useState<TestState>({ kind: "idle" });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [timesOpen, setTimesOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeWord, setWipeWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        setPushSubscribed(!!subscription);
      })
      .catch(() => {});
  }, [pushSupported]);

  function flashSaved() {
    setSavedAt(Date.now());
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedAt(null), 2200);
  }

  async function patch(payload: Record<string, unknown>): Promise<boolean> {
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("save failed");
      flashSaved();
      router.refresh();
      return true;
    } catch {
      toast.error("บันทึกการตั้งค่าไม่สำเร็จ");
      return false;
    }
  }

  async function saveWebhook() {
    const trimmed = webhook.trim();
    if (trimmed === initialWebhook.trim()) return;
    setTest({ kind: "idle" });
    await patch({ webhookUrl: trimmed });
  }

  async function runTest() {
    setTest({ kind: "testing" });
    try {
      const response = await fetch("/api/test-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhook.trim() }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        status: number;
        error?: string;
      };
      if (data.ok) {
        setTest({ kind: "ok" });
      } else {
        setTest({
          kind: "error",
          message: `${data.status ? `${data.status} · ` : ""}${data.error ?? "ส่งไม่สำเร็จ"}`,
        });
      }
    } catch {
      setTest({ kind: "error", message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" });
    }
  }

  async function saveTimes() {
    setBusy(true);
    const ok = await patch({ periodTimes: draftTimes });
    setBusy(false);
    if (ok) {
      setPeriodTimes(draftTimes);
      setTimesOpen(false);
    }
  }

  async function wipe() {
    setBusy(true);
    try {
      const response = await fetch("/api/settings/data", { method: "DELETE" });
      if (!response.ok) throw new Error("wipe failed");
      toast.success("ล้างข้อมูลแล้ว");
      setWipeOpen(false);
      setWipeWord("");
      router.refresh();
    } catch {
      toast.error("ล้างข้อมูลไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
      setBusy(false);
    }
  }

  async function enablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (!("Notification" in window)) throw new Error("not-supported");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("permission-denied");

      const registration = await navigator.serviceWorker.ready;
      const keyResponse = await fetch("/api/push/vapid");
      if (!keyResponse.ok) throw new Error("vapid");
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = subscription.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("invalid-subscription");
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      });
      if (!response.ok) throw new Error("subscribe-failed");

      setPushSubscribed(true);
      toast.success("เปิด Push แล้ว");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "subscribe-failed";
      const friendly =
        message === "permission-denied"
          ? "คุณปฏิเสธการแจ้งเตือน"
          : message === "vapid"
            ? "เซิร์ฟเวอร์ยังไม่ตั้งค่า VAPID"
            : "เปิด Push ไม่สำเร็จ";
      setPushError(friendly);
      toast.error(friendly);
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushSubscribed(false);
      toast.success("ปิด Push แล้ว");
    } catch {
      setPushError("ปิด Push ไม่สำเร็จ");
      toast.error("ปิด Push ไม่สำเร็จ");
    } finally {
      setPushBusy(false);
    }
  }

  const lastSentLabel = lastLog?.sentAt
    ? new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
        timeZone: "Asia/Bangkok",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(lastLog.sentAt))
    : "ยังไม่เคยส่ง";

  const themeChoice: ThemeChoice =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <PageHeader
        title="ตั้งค่า"
        subtitle="Discord · ตารางเรียน · การแสดงผล"
        action={
          <span
            aria-live="polite"
            className={cn(
              "flex items-center gap-1 text-[12px] font-medium text-success transition-opacity duration-200",
              savedAt ? "opacity-100" : "opacity-0",
            )}
          >
            <Check className="size-3.5" aria-hidden="true" />
            บันทึกแล้ว
          </span>
        }
      />

      <ListSection
        title="Discord"
        footer="สร้าง webhook ได้ที่ Channel settings → Integrations → Webhooks"
      >
        <div className="p-3">
          <Label htmlFor="webhook">Webhook URL</Label>
          <div className="relative mt-1.5">
            <Input
              id="webhook"
              type={reveal ? "text" : "password"}
              value={webhook}
              onChange={(event) => setWebhook(event.target.value)}
              onBlur={saveWebhook}
              placeholder="https://discord.com/api/webhooks/…"
              spellCheck={false}
              autoComplete="off"
              className="h-12 pr-12 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "ซ่อน webhook" : "แสดง webhook"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[12px] text-muted-foreground"
            >
              {reveal ? (
                <EyeOff className="size-[18px]" aria-hidden="true" />
              ) : (
                <Eye className="size-[18px]" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={runTest}
              disabled={test.kind === "testing" || !webhook.trim()}
              className="h-11 rounded-full px-4 text-[13px]"
            >
              {test.kind === "testing" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-4" aria-hidden="true" />
              )}
              ส่งข้อความทดสอบ
            </Button>

            {test.kind === "ok" ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
                <Check className="size-3.5" aria-hidden="true" />
                ส่งสำเร็จ
              </span>
            ) : null}
            {test.kind === "error" ? (
              <span
                role="alert"
                className="inline-flex items-center gap-1 text-[12px] text-destructive"
              >
                <X className="size-3.5" aria-hidden="true" />
                ส่งไม่สำเร็จ · {test.message}
              </span>
            ) : null}
          </div>
        </div>
      </ListSection>

      <ListSection title="การแจ้งเตือน" footer="สรุปครั้งเดียวต่อวัน ตามเวลาไทย">
        <ListRow className="justify-between">
          <span className="text-[15px]">เวลาสรุป</span>
          <input
            id="digest-time"
            type="time"
            aria-label="เวลาสรุป"
            value={digestTime}
            onChange={(event) => setDigestTime(event.target.value)}
            onBlur={() => {
              if (digestTime && digestTime !== initialDigestTime) {
                void patch({ digestTime });
              }
            }}
            className={timeInputClass}
          />
        </ListRow>

        <ListRow className="justify-between">
          <span className="text-[15px]">ช่วงล่วงหน้า</span>
          <div className="relative">
            <select
              id="window-days"
              value={windowDays}
              onChange={(event) => {
                const value = Number(event.target.value);
                setWindowDays(value);
                void patch({ windowDays: value });
              }}
              aria-label="ช่วงล่วงหน้า"
              className="h-11 appearance-none rounded-[8px] border-0 bg-fill pr-7 pl-2.5 text-[15px] text-foreground tabular outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value={3}>3 วัน</option>
              <option value={7}>7 วัน</option>
              <option value={14}>14 วัน</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        </ListRow>

        <ListRow className="justify-between">
          <span className="text-[15px]">ส่งล่าสุด</span>
          <span className="tabular text-right text-[13px] text-muted-foreground">
            {lastSentLabel}
            {lastLog?.sentAt ? ` · ${lastLog.itemCount} รายการ` : ""}
          </span>
        </ListRow>

        <ListRow className="justify-between">
          <span className="text-[15px]">รอบถัดไป</span>
          <span className="tabular text-right text-[13px] text-muted-foreground">
            {nextRunLabel}
          </span>
        </ListRow>

        {lastLog?.error && lastLog.error !== "empty" ? (
          <ListRow className="bg-destructive/5">
            <span className="text-[13px] text-destructive">
              รอบล่าสุดล้มเหลว · {lastLog.error}
            </span>
          </ListRow>
        ) : null}
      </ListSection>

      <ListSection title="ตารางเรียน" footer={`${lessonCount} คาบ · เขตเวลา Asia/Bangkok`}>
        <button
          type="button"
          onClick={() => {
            setDraftTimes(periodTimes);
            setTimesOpen(true);
          }}
          className={listRowClass}
        >
          <Clock className="size-[18px] text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-[15px]">เวลาแต่ละคาบ</span>
          <ListChevron />
        </button>

        <a href="/api/schedule" download="schedule.json" className={listRowClass}>
          <Download
            className="size-[18px] text-muted-foreground"
            aria-hidden="true"
          />
          <span className="flex-1 text-[15px]">ดาวน์โหลดตาราง JSON</span>
          <ListChevron />
        </a>

        <a href="/timetable" className={listRowClass}>
          <Table2
            className="size-[18px] text-muted-foreground"
            aria-hidden="true"
          />
          <span className="flex-1 text-[15px]">นำเข้า / แก้ไขที่หน้าตาราง</span>
          <ListChevron />
        </a>
      </ListSection>

      <ListSection title="การแสดงผล">
        <div className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[15px]">ธีม</span>
            <span className="text-[12px] text-muted-foreground">
              {mounted ? THEME_LABEL[themeChoice] : ""}
            </span>
          </div>
          <Segmented
            value={themeChoice}
            onChange={(value) => setTheme(value)}
            options={THEME_OPTIONS}
            label="ธีม"
          />
        </div>
      </ListSection>

      <ListSection
        title="ข้อมูล"
        footer={`${taskCount} งานในระบบ · ลบงานและประวัติ แต่เก็บตารางเรียนไว้`}
      >
        <a href="/export/month" className={listRowClass}>
          <FileDown
            className="size-[18px] text-muted-foreground"
            aria-hidden="true"
          />
          <span className="flex-1 text-[15px]">ส่งออกงานรายเดือน</span>
          <span className="text-[13px] text-muted-foreground">PNG · PDF</span>
          <ListChevron />
        </a>
        <button
          type="button"
          onClick={() => setWipeOpen(true)}
          className={cn(
            listRowClass,
            "justify-center gap-2 font-medium text-destructive",
          )}
        >
          <Trash2 className="size-[18px]" aria-hidden="true" />
          ล้างข้อมูลงานทั้งหมด
        </button>
      </ListSection>

      <ListSection
        title="Push หลังคาบ"
        footer={
          mounted && isIOS && !isStandalone
            ? "iOS: ติดตั้งแอปลง Home Screen ก่อน จึงเปิด Push ได้"
            : "แจ้งเตือนเฉพาะคาบที่มีเรียน เมื่อคาบจบ"
        }
      >
        <ListRow className="justify-between">
          <span className="text-[15px]">สถานะ</span>
          <span className="text-[13px] text-muted-foreground">
            {!pushSupported
              ? "ไม่รองรับ"
              : pushSubscribed
                ? "เปิดอยู่"
                : "ปิดอยู่"}
          </span>
        </ListRow>

        {pushSupported ? (
          <div className="p-3">
            <Button
              type="button"
              onClick={pushSubscribed ? disablePush : enablePush}
              disabled={pushBusy}
              className="h-11 w-full rounded-full"
            >
              {pushBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : pushSubscribed ? (
                <BellOff className="size-4" aria-hidden="true" />
              ) : (
                <Bell className="size-4" aria-hidden="true" />
              )}
              {pushSubscribed ? "ปิด Push" : "เปิด Push"}
            </Button>
            {pushError ? (
              <p className="mt-2 text-[13px] text-destructive" role="alert">
                {pushError}
              </p>
            ) : null}
          </div>
        ) : null}
      </ListSection>

      <ListSection title="บัญชี">
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className={cn(
            listRowClass,
            "justify-center gap-2 font-medium text-destructive disabled:opacity-40",
          )}
        >
          <LogOut className="size-[18px]" aria-hidden="true" />
          ออกจากระบบ
        </button>
      </ListSection>

      <ListSection title="เกี่ยวกับ">
        <ListRow className="justify-between">
          <span className="text-[15px]">เวอร์ชัน</span>
          <span className="tabular text-[13px] text-muted-foreground">0.1.0</span>
        </ListRow>
        <ListRow className="justify-between">
          <span className="text-[15px]">เขตเวลา</span>
          <span className="text-[13px] text-muted-foreground">
            Asia/Bangkok (ค.ศ.)
          </span>
        </ListRow>
        {appUrl ? (
          <ListRow className="justify-between gap-4">
            <span className="shrink-0 text-[15px]">URL</span>
            <span className="truncate text-[13px] text-muted-foreground">
              {appUrl}
            </span>
          </ListRow>
        ) : null}
      </ListSection>

      <Sheet open={timesOpen} onOpenChange={setTimesOpen}>
        <SheetContent side="bottom" className="mx-auto w-full gap-0 sm:max-w-lg">
          <SheetHeader className="pr-14">
            <SheetTitle>เวลาแต่ละคาบ</SheetTitle>
            <SheetDescription>
              ใช้แสดงในตารางเรียนและหน้าแรก
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-1.5 px-5 pb-3">
            {Array.from({ length: 10 }, (_, index) => String(index + 1)).map(
              (period) => (
                <div key={period} className="flex items-center gap-2">
                  <span className="tabular w-14 shrink-0 text-[13px] text-muted-foreground">
                    คาบ {period}
                  </span>
                  <input
                    type="time"
                    aria-label={`เวลาเริ่มคาบ ${period}`}
                    value={draftTimes[period]?.start ?? ""}
                    onChange={(event) =>
                      setDraftTimes((current) => ({
                        ...current,
                        [period]: {
                          start: event.target.value,
                          end: current[period]?.end ?? "",
                        },
                      }))
                    }
                    className="h-10 min-w-0 flex-1 rounded-[8px] border-0 bg-fill px-2 text-[14px] tabular outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                  <span className="text-muted-foreground">–</span>
                  <input
                    type="time"
                    aria-label={`เวลาจบคาบ ${period}`}
                    value={draftTimes[period]?.end ?? ""}
                    onChange={(event) =>
                      setDraftTimes((current) => ({
                        ...current,
                        [period]: {
                          start: current[period]?.start ?? "",
                          end: event.target.value,
                        },
                      }))
                    }
                    className="h-10 min-w-0 flex-1 rounded-[8px] border-0 bg-fill px-2 text-[14px] tabular outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </div>
              ),
            )}

            <SheetFooter className="-mx-5 flex-row justify-end gap-2 px-5 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTimesOpen(false)}
                className="h-11"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={saveTimes}
                disabled={busy}
                className="h-11 min-w-28"
              >
                บันทึก
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={wipeOpen} onOpenChange={setWipeOpen}>
        <SheetContent side="bottom" className="mx-auto w-full gap-0 sm:max-w-md">
          <SheetHeader className="pr-14">
            <SheetTitle>ล้างข้อมูลทั้งหมด</SheetTitle>
            <SheetDescription>
              งานทุกชิ้นและประวัติการแจ้งเตือนจะถูกลบถาวร พิมพ์ “ล้าง” เพื่อยืนยัน
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 px-5 pb-4">
            <Input
              value={wipeWord}
              onChange={(event) => setWipeWord(event.target.value)}
              placeholder="ล้าง"
              aria-label="พิมพ์คำยืนยัน"
            />
            <SheetFooter className="-mx-5 flex-row justify-end gap-2 px-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setWipeOpen(false)}
                className="h-11"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={wipe}
                disabled={wipeWord.trim() !== "ล้าง" || busy}
                className="h-11"
              >
                ลบถาวร
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
