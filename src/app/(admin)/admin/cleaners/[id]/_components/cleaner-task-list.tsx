import { Card, CardContent } from "@/components/ui/card";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  offered: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

interface CleaningTask {
  id: string;
  status?: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  property: { name: string };
  stay?: { guestName?: string | null } | null;
}

interface CleanerTaskListProps {
  upcomingTasks: CleaningTask[];
  pastTasks: CleaningTask[];
}

function TaskCard({ task, faded }: { task: CleaningTask; faded?: boolean }) {
  return (
    <Card className={faded ? "opacity-70" : undefined}>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">{task.property.name}</p>
          <p className="text-sm text-muted-foreground">
            {faded
              ? new Date(task.scheduledStart).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })
              : <>
                  {new Date(task.scheduledStart).toLocaleDateString("en-US", {
                    weekday: "short", month: "short", day: "numeric",
                  })}
                  {" · "}
                  {new Date(task.scheduledStart).toLocaleTimeString("en-US", {
                    hour: "numeric", minute: "2-digit",
                  })}
                  {" – "}
                  {new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
                    hour: "numeric", minute: "2-digit",
                  })}
                  {task.stay?.guestName && ` · ${task.stay.guestName}`}
                </>
            }
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${task.status ? (statusColors[task.status] ?? "") : ""}`}>
          {task.status?.replace("_", " ") ?? "—"}
        </span>
      </CardContent>
    </Card>
  );
}

export function CleanerTaskList({ upcomingTasks, pastTasks }: CleanerTaskListProps) {
  if (upcomingTasks.length === 0 && pastTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No tasks assigned yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {upcomingTasks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Upcoming Tasks</h2>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {pastTasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Past Tasks</h2>
          <div className="space-y-2">
            {pastTasks.slice(0, 20).map((task) => (
              <TaskCard key={task.id} task={task} faded />
            ))}
            {pastTasks.length > 20 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Showing 20 of {pastTasks.length} past tasks
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
