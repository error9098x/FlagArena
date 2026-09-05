import {
  Activity,
  Flag,
  Trophy,
  Users,
  PencilLine,
  ShieldCheck,
  UserRoundX,
  ClipboardCheck,
  Target,
} from "lucide-react";
import type { DashboardDto } from "@flagarena/shared";
import {
  Card,
  CardHeader,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { number } from "@/lib/format";

const details = {
  Players: { icon: Users, tone: "info", note: "People in your community" },
  Authors: {
    icon: PencilLine,
    tone: "violet",
    note: "Building the challenge library",
  },
  Admins: {
    icon: ShieldCheck,
    tone: "success",
    note: "Managing this instance",
  },
  Suspended: {
    icon: UserRoundX,
    tone: "rose",
    note: "Accounts with access paused",
  },
  "Pending reviews": {
    icon: ClipboardCheck,
    tone: "warning",
    note: "Waiting for an admin review",
  },
  "Published challenges": {
    icon: Flag,
    tone: "success",
    note: "Approved in the challenge bank",
  },
  "Practice score": {
    icon: Activity,
    tone: "success",
    note: "Points from accepted practice flags",
  },
  "Practice rank": {
    icon: Trophy,
    tone: "warning",
    note: "Your place on the practice board",
  },
  "Practice solves": {
    icon: Flag,
    tone: "violet",
    note: "Challenges you've completed",
  },
  Attempted: {
    icon: Target,
    tone: "info",
    note: "Unique challenges across contexts",
  },
} as const;

export function DashboardStats({ stats }: { stats: DashboardDto["stats"] }) {
  return (
    <div className="dashboard-stats">
      {stats.map((stat) => {
        const detail = details[stat.label as keyof typeof details];
        const Icon = detail?.icon ?? Activity;
        return (
          <Card key={stat.label} className="stat-card">
            <CardHeader>
              <CardDescription>{stat.label}</CardDescription>
              <CardAction>
                <span className="stat-icon" data-tone={detail?.tone}>
                  <Icon aria-hidden="true" />
                </span>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="stat-value">
                {stat.label === "Practice rank" && stat.value === 0
                  ? "—"
                  : number(stat.value)}
              </p>
              <p className="stat-note">{detail?.note ?? "Current total"}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
