export const formatDateInTimezone = (
  timezone: string,
  baseDate: Date = new Date()
): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(baseDate);
  const values: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });
  return `${values.year}-${values.month}-${values.day}`;
};

export const shiftDate = (date: string, days: number): string => {
  const dt = new Date(`${date}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};
