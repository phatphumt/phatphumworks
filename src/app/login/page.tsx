"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    if (!passcode.trim()) {
      setError("ใส่รหัสผ่านก่อน");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        remaining?: number;
        retryAfter?: number;
      };

      if (data.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        const target = next && next.startsWith("/") ? next : "/";
        router.replace(target);
        router.refresh();
        return;
      }

      if (data.error === "locked") {
        const minutes = Math.max(1, Math.ceil((data.retryAfter ?? 600) / 60));
        setError(`ลองผิดหลายครั้งเกินไป · รออีก ${minutes} นาที`);
        setRemaining(0);
      } else {
        setRemaining(data.remaining ?? null);
        setError("รหัสผ่านไม่ถูกต้อง");
        setPasscode("");
      }
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ · ลองอีกครั้ง");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login-bg flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="glass rounded-[24px] p-6">
          <div className="mb-7 flex flex-col items-center text-center">
            <span
              aria-hidden="true"
              className="mb-4 flex size-14 items-center justify-center rounded-[18px] bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(0,113,227,0.8)]"
            >
              <GraduationCap className="size-7" strokeWidth={1.9} />
            </span>
            <h1 className="text-[28px] leading-tight font-bold">งานของฉัน</h1>
            <p className="mt-1.5 text-[14px] text-muted-foreground">
              ใส่รหัสเพื่อเข้าใช้งาน
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="passcode">รหัสผ่าน</Label>
              <div className="relative">
                {/* Edge injects an inline caret-color before hydration; suppress the noise. */}
                <Input
                  id="passcode"
                  name="passcode"
                  type={reveal ? "text" : "password"}
                  autoComplete="current-password"
                  suppressHydrationWarning
                  value={passcode}
                  onChange={(event) => {
                    setPasscode(event.target.value);
                    if (error) setError(null);
                  }}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "passcode-error" : undefined}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setReveal((value) => !value)}
                  aria-label={reveal ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[12px] text-muted-foreground"
                >
                  {reveal ? (
                    <EyeOff className="size-[18px]" strokeWidth={1.9} />
                  ) : (
                    <Eye className="size-[18px]" strokeWidth={1.9} />
                  )}
                </button>
              </div>
              {error ? (
                <p
                  id="passcode-error"
                  role="alert"
                  className="text-[13px] text-destructive"
                >
                  {error}
                  {remaining !== null && remaining > 0
                    ? ` · เหลือ ${remaining} ครั้ง`
                    : null}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={pending}
              className="h-12 w-full rounded-[12px] text-[16px]"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  กำลังเข้า…
                </>
              ) : (
                "เข้าใช้งาน"
              )}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12px] text-muted-foreground">
          ระบบส่วนตัว · ใช้คนเดียว
        </p>
      </div>
    </main>
  );
}
