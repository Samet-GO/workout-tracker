"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  className?: string;
  backHref?: string;
  children?: React.ReactNode;
}

export function Header({ title, className, children }: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80",
        className
      )}
    >
      <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
      <div className="flex items-center gap-2">
        {children}
        <Link
          href="/settings"
          className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        </Link>
      </div>
    </header>
  );
}
