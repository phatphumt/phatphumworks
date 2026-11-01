"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-[640px] py-12">
      <EmptyState
        icon={CircleAlert}
        title="เกิดข้อผิดพลาด"
        description="โหลดข้อมูลไม่สำเร็จ ลองอีกครั้งได้เลย"
      >
        <Button onClick={reset} className="h-11 rounded-full px-5">
          ลองอีกครั้ง
        </Button>
      </EmptyState>
    </div>
  );
}
