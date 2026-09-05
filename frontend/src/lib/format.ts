export const labels: Record<string, string> = {
  web: "Web",
  crypto: "Crypto",
  forensics: "Forensics",
  reverse: "Reverse engineering",
  pwn: "Pwn",
  osint: "OSINT",
  misc: "Misc",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  public_practice: "Public practice",
  event_only: "Event only",
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  disabled: "Disabled",
  archived: "Archived",
  scheduled: "Scheduled",
  active: "Active",
  ended: "Ended",
  admin: "Admin",
  author: "Challenge Author",
  player: "Player",
  open: "Open",
  invite_only: "Invite only",
};
export const label = (value: string) => labels[value] ?? value;
export const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
export const number = (value: number) => new Intl.NumberFormat().format(value);
export const eventQuery = (id?: string) =>
  id ? `?eventId=${encodeURIComponent(id)}` : "";
