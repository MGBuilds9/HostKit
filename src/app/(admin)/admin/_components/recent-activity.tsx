import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, SprayCan, ArrowRight } from "lucide-react";
import Link from "next/link";

interface CleaningTask {
  id: string;
  status: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  property: { name: string };
  assignedCleaner: { fullName: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  offered: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  in_progress: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

interface RecentActivityProps {
  todaysTasks: CleaningTask[];
}

export function RecentActivity({ todaysTasks }: RecentActivityProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Today&apos;s Tasks
          </CardTitle>
          <Link
            href="/admin/cleaning-tasks"
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {todaysTasks.length === 0 ? (
          <EmptyState
            dashed
            icon={SprayCan}
            title="No tasks today"
            description="All clear for now"
            className="py-10"
          />
        ) : (
          <ul className="space-y-2">
            {todaysTasks.map((task) => (
              <li
                key={task.id}
                className="flex min-h-[52px] items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-border hover:bg-accent/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{task.property.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(task.scheduledStart).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" - "}
                    {new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {task.assignedCleaner && (
                      <span className="ml-1">&middot; {task.assignedCleaner.fullName}</span>
                    )}
                  </p>
                </div>
                <span
                  className={`ml-2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    statusColors[task.status ?? "pending"] || ""
                  }`}
                >
                  {(task.status ?? "pending").replace("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
