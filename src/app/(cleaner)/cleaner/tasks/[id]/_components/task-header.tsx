"use client";

import { cn } from "@/lib/utils";
import { Clock, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type TaskDetail, statusConfig } from "./task-types";

interface TaskHeaderProps {
  task: TaskDetail;
}

export function TaskHeader({ task }: TaskHeaderProps) {
  const config = statusConfig[task.status];

  const startTime = new Date(task.scheduledStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTime = new Date(task.scheduledEnd).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = new Date(task.scheduledStart).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              config.className
            )}
          >
            {config.label}
          </span>
          {task.triggerType && (
            <span className="text-xs text-muted-foreground capitalize">
              {task.triggerType} clean
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold">{task.property.name}</h1>
        <p className="text-sm text-muted-foreground">
          {task.property.addressStreet}, {task.property.addressCity},{" "}
          {task.property.addressProvince}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">{dateLabel}</p>
              <p className="text-muted-foreground">
                {startTime} – {endTime}
              </p>
            </div>
          </div>
          {task.stay?.guestName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <p>Guest: {task.stay.guestName}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {(task.property.wifiName || task.property.parkingSpot) && (
        <Card>
          <div className="px-4 pt-4 pb-2">
            <p className="text-sm font-medium">Access Info</p>
          </div>
          <CardContent className="p-4 pt-0 space-y-2">
            {task.property.wifiName && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">WiFi</span>
                <div>
                  <p className="font-medium">{task.property.wifiName}</p>
                  {task.property.wifiPassword && (
                    <p className="text-muted-foreground font-mono text-xs">
                      {task.property.wifiPassword}
                    </p>
                  )}
                </div>
              </div>
            )}
            {task.property.parkingSpot && (
              <div className="flex items-start gap-2 text-sm">
                <span className="text-muted-foreground shrink-0 mt-0.5 text-xs">Park</span>
                <div>
                  <p className="font-medium">Parking: {task.property.parkingSpot}</p>
                  {task.property.parkingInstructions && (
                    <p className="text-muted-foreground text-xs">
                      {task.property.parkingInstructions}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
