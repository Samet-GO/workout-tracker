"use client";

import { useEffect, useRef, useId, type ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Sheet({ open, onClose, title, children, className }: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const titleId = useId();

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap
  useEffect(() => {
    if (open) {
      // Store current focus
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);

      // Focus first focusable element in sheet
      requestAnimationFrame(() => {
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable?.length) {
          focusable[0].focus();
        }
      });
    } else {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      // Restore focus
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // Trap focus within sheet
  const handleFocusTrap = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab") return;
    const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            onKeyDown={handleFocusTrap}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-zinc-900 pb-safe",
              className
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose();
              }
            }}
          >
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 px-4 pb-2 pt-3">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden="true" />
              <div className="flex items-center justify-between">
                {title && (
                  <h2 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {title}
                  </h2>
                )}
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close dialog"
                >
                  <X className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
