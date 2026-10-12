"use client";
import { MotionConfig } from "motion/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="top-center"
        richColors
        toastOptions={{ style: { fontFamily: "var(--font-sans)", borderRadius: 14 } }}
        offset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      />
    </MotionConfig>
  );
}
