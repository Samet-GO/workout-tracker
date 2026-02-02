"use client";

import Link from "next/link";
import { Clock, Calendar, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WorkoutTemplate } from "@/lib/db";

interface PlanCardProps {
  plan: WorkoutTemplate;
}

export function PlanCard({ plan }: PlanCardProps) {
  return (
    <Link href={`/plans/${plan.id}`}>
      <Card className="active:scale-[0.98] transition-transform">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{plan.name}</h3>
            {plan.description && (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                {plan.description}
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">
            <Calendar className="mr-1 h-3 w-3" />
            {plan.frequency}x/week
          </Badge>
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            {plan.durationMinutes} min
          </Badge>
          <Badge variant="secondary">
            <Target className="mr-1 h-3 w-3" />
            {plan.focus}
          </Badge>
        </div>
        <div className="mt-2 flex gap-1.5">
          {plan.splitDays.map((day, i) => (
            <span
              key={i}
              className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize dark:bg-blue-900/30 dark:text-blue-300"
            >
              {day}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  );
}
