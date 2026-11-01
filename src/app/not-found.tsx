import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="login-bg flex min-h-dvh items-center justify-center px-5">
      <div className="w-full max-w-[380px]">
        <EmptyState
          icon={SearchX}
          title="ไม่พบหน้านี้"
          description="ลิงก์อาจเก่า หรือหน้านี้ถูกย้ายไปแล้ว"
        >
          <Link
            href="/"
            className={buttonVariants({ className: "h-11 rounded-full px-5" })}
          >
            กลับหน้าหลัก
          </Link>
        </EmptyState>
      </div>
    </main>
  );
}
