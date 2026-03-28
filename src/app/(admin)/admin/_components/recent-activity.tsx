import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Today&apos;s Tasks
          </CardTitle>
          <Link
            href="/admin/cleaning-tasks"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {todaysTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <SprayCan className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No tasks today</p>
            <p className="text-xs text-muted-foreground mt-0.5">All clear for now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{task.property.name}</p>
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
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ml-2 ${
                    statusColors[task.status ?? "pending"] || ""
                  }`}
                >
                  {(task.status ?? "pending").replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
