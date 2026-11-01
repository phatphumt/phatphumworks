"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-[18px] text-success" />
        ),
        info: (
          <InfoIcon className="size-[18px] text-primary" />
        ),
        warning: (
          <TriangleAlertIcon className="size-[18px] text-warning" />
        ),
        error: (
          <OctagonXIcon className="size-[18px] text-destructive" />
        ),
        loading: (
          <Loader2Icon className="size-[18px] animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "color-mix(in srgb, var(--foreground) 8%, transparent)",
          "--border-radius": "16px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !rounded-[16px] !shadow-[0_12px_32px_-10px_rgba(0,0,0,0.28)] !text-[14px]",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground",
          cancelButton: "!bg-fill !text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
