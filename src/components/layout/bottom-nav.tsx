"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Dumbbell, Library, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

const navItems = [
  { href: "/plans", label: "Plans", icon: ClipboardList },
  { href: "/workout", label: "Workout", icon: Dumbbell },
  { href: "/exercises", label: "Exercises", icon: Library },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();

  const activeSession = useLiveQuery(
    () =>
      db.workoutSessions
        .filter((s) => !s.completedAt)
        .first(),
    []
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 pb-safe">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          const showBadge = href === "/workout" && !!activeSession;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-xs transition-colors",
                isActive
                  ? "text-blue-600"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-white dark:ring-zinc-900" />
                )}
              </div>
              <span className={cn("font-medium", isActive && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
