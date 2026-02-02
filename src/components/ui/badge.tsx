import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        secondary: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
        success: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
        destructive: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
        outline: "border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}
