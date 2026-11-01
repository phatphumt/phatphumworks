import Link from "next/link";
import { SearchX } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppNotFound() {
  return (
    <div className="mx-auto w-full max-w-[640px] py-12">
      <EmptyState
        icon={SearchX}
        title="ไม่พบหน้านี้"
        description="ลิงก์อาจเก่า หรือรายการนี้อาจถูกลบไปแล้ว"
      >
        <Link
          href="/"
          className={buttonVariants({ className: "h-11 rounded-full px-5" })}
        >
          กลับหน้าหลัก
        </Link>
      </EmptyState>
    </div>
  );
}
