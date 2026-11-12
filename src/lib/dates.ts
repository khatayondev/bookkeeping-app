// src/lib/dates.ts
/**
 * Helper functions for date manipulation.
 * Weeks start on Monday.
 */
export function today(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function stripTime(d: Date): Date {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

export function startOfWeek(date?: Date): Date {
  const d = date ? new Date(date) : today();
  const day = d.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = (day + 6) % 7; // days since Monday
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfWeek(date?: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function startOfMonth(date?: Date): Date {
  const d = date ? new Date(date) : today();
  const start = new Date(d);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfMonth(date?: Date): Date {
  const d = date ? new Date(date) : today();
  const startNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const end = new Date(startNextMonth);
  end.setDate(end.getDate() - 1);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function formatDate(date: Date): string {
  const todayDate = today();
  const yesterday = new Date(todayDate);
  yesterday.setDate(todayDate.getDate() - 1);
  const d = stripTime(date);
  if (d.getTime() === todayDate.getTime()) return "Today";
  if (d.getTime() === yesterday.getTime()) return "Yesterday";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dayName = weekdays[d.getDay()];
  const dayNum = d.getDate();
  const monthName = months[d.getMonth()];
  return `${dayName} ${dayNum} ${monthName}`;
}

export function isOverdue(dueDate: Date): boolean {
  const todayDate = today();
  const due = stripTime(dueDate);
  return due.getTime() < todayDate.getTime();
}
