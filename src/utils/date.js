export function toKstDateTime(dateStr, endOfDay = false) {
  if (!dateStr) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }

  const [year, month, day] = dateStr.split("-").map(Number);

  const hour = endOfDay ? 23 : 0;
  const minute = endOfDay ? 59 : 0;
  const second = endOfDay ? 59 : 0;

  return new Date(
    Date.UTC(year, month - 1, day, hour - 9, minute, second)
  );
}
