/** NYSE regular session: America/New_York 09:30–16:00 weekdays. Holidays not applied. */

const TZ = "America/New_York";

export type SessionState = {
  open: boolean;
  label: "OPEN" | "CLOSED";
  weekday: string;
  clock: string;
  timeZone: typeof TZ;
};

export function nyseSession(now = new Date()): SessionState {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const weekday = get("weekday");
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const minutes = hour * 60 + minute;
  const weekend = weekday === "Sat" || weekday === "Sun";
  const open = !weekend && minutes >= 9 * 60 + 30 && minutes < 16 * 60;
  const clock = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    open,
    label: open ? "OPEN" : "CLOSED",
    weekday,
    clock,
    timeZone: TZ,
  };
}
