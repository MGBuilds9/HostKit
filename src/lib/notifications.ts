import { db } from "@/db";
import { notifications, cleaningTasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_ADDRESS = "HostKit <notifications@hostkit.mkgbuilds.com>";

// ─── Helpers ────────────────────────────────────────────────────────────────

export function formatTaskDate(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function taskUrl(taskId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://hostkit.mkgbuilds.com";
  return `${base}/tasks/${taskId}`;
}

// ─── Email HTML builder ──────────────────────────────────────────────────────

interface TaskEmailData {
  propertyName: string;
  propertyAddress: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  guestName?: string | null;
  status?: string | null;
  taskId: string;
  headingText: string;
  subText: string;
}

function buildEmailHtml(data: TaskEmailData): string {
  const {
    propertyName,
    propertyAddress,
    scheduledStart,
    scheduledEnd,
    guestName,
    status,
    taskId,
    headingText,
    subText,
  } = data;

  const url = taskUrl(taskId);

  const rows = [
    ["Property", `<strong>${propertyName}</strong>`],
    ["Address", propertyAddress],
    ["Start", formatTaskDate(scheduledStart)],
    ["End", formatTaskDate(scheduledEnd)],
    ...(guestName ? [["Guest", guestName]] : []),
    ...(status ? [["Status", status]] : []),
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top;">${label}</td>
        <td style="padding:6px 0;color:#111827;">${value}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:32px;">
          <tr>
            <td>
              <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6366f1;">HostKit</p>
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${headingText}</h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">${subText}</p>
              <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e5e7eb;margin-bottom:24px;">
                <tbody>${tableRows}</tbody>
              </table>
              <a href="${url}"
                style="display:inline-block;padding:10px 20px;background:#6366f1;color:#ffffff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">
                View Task
              </a>
              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
                You're receiving this because you are assigned to a cleaning task in HostKit.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Task loader ─────────────────────────────────────────────────────────────

async function loadTaskWithRelations(taskId: string) {
  const result = await db.query.cleaningTasks.findFirst({
    where: eq(cleaningTasks.id, taskId),
    with: {
      assignedCleaner: true,
      property: true,
      stay: true,
    },
  });
  return result ?? null;
}

// ─── Notification inserter ────────────────────────────────────────────────────

async function insertNotification(opts: {
  userId: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string;
}): Promise<void> {
  await db.insert(notifications).values({
    userId: opts.userId,
    type: opts.type,
    title: opts.title,
    body: opts.body,
    linkUrl: opts.linkUrl,
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function notifyTaskAssigned(taskId: string): Promise<void> {
  const task = await loadTaskWithRelations(taskId);

  if (!task?.assignedCleaner || !task.assignedCleaner.email || !task.assignedCleaner.userId) return;

  const cleaner = task.assignedCleaner;
  const cleanerEmail = cleaner.email!;
  const cleanerUserId = cleaner.userId!;
  const { property, stay } = task;
  const title = "New cleaning task assigned";
  const body = `You have been assigned a cleaning task at ${property.name}.`;

  await insertNotification({
    userId: cleanerUserId,
    type: "task_assigned",
    title,
    body,
    linkUrl: taskUrl(taskId),
  });

  if (!resend) return;

  const html = buildEmailHtml({
    propertyName: property.name,
    propertyAddress: property.addressStreet,
    scheduledStart: task.scheduledStart,
    scheduledEnd: task.scheduledEnd,
    guestName: stay?.guestName,
    taskId,
    headingText: "New cleaning task assigned",
    subText: "You have a new cleaning task. Here are the details:",
  });

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: cleanerEmail,
      subject: "New cleaning task assigned",
      html,
    });
  } catch (err) {
    console.error("[notifications] Failed to send task-assigned email:", err);
  }
}

export async function notifyTaskUpdated(taskId: string): Promise<void> {
  const task = await loadTaskWithRelations(taskId);

  if (!task?.assignedCleaner || !task.assignedCleaner.email || !task.assignedCleaner.userId) return;

  const cleaner = task.assignedCleaner;
  const cleanerEmail = cleaner.email!;
  const cleanerUserId = cleaner.userId!;
  const { property, stay } = task;
  const title = "Cleaning task updated";
  const body = `Your cleaning task at ${property.name} has been updated. Current status: ${task.status}.`;

  await insertNotification({
    userId: cleanerUserId,
    type: "task_updated",
    title,
    body,
    linkUrl: taskUrl(taskId),
  });

  if (!resend) return;

  const html = buildEmailHtml({
    propertyName: property.name,
    propertyAddress: property.addressStreet,
    scheduledStart: task.scheduledStart,
    scheduledEnd: task.scheduledEnd,
    guestName: stay?.guestName,
    status: task.status,
    taskId,
    headingText: "Cleaning task updated",
    subText: "Details for your cleaning task have changed. See the latest below:",
  });

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: cleanerEmail,
      subject: "Cleaning task updated",
      html,
    });
  } catch (err) {
    console.error("[notifications] Failed to send task-updated email:", err);
  }
}

export async function notifyTaskCancelled(taskId: string): Promise<void> {
  const task = await loadTaskWithRelations(taskId);

  if (!task?.assignedCleaner || !task.assignedCleaner.email || !task.assignedCleaner.userId) return;

  const cleaner = task.assignedCleaner;
  const cleanerEmail = cleaner.email!;
  const cleanerUserId = cleaner.userId!;
  const { property, stay } = task;
  const title = "Cleaning task cancelled";
  const body = `Your cleaning task at ${property.name} scheduled for ${formatTaskDate(task.scheduledStart)} has been cancelled.`;

  await insertNotification({
    userId: cleanerUserId,
    type: "task_cancelled",
    title,
    body,
    linkUrl: taskUrl(taskId),
  });

  if (!resend) return;

  const html = buildEmailHtml({
    propertyName: property.name,
    propertyAddress: property.addressStreet,
    scheduledStart: task.scheduledStart,
    scheduledEnd: task.scheduledEnd,
    guestName: stay?.guestName,
    status: "cancelled",
    taskId,
    headingText: "Cleaning task cancelled",
    subText: "The following cleaning task has been cancelled:",
  });

  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: cleanerEmail,
      subject: "Cleaning task cancelled",
      html,
    });
  } catch (err) {
    console.error("[notifications] Failed to send task-cancelled email:", err);
  }
}
