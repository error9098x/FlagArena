import { Link } from "react-router-dom";
import type { DashboardDto } from "@flagarena/shared";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/Feedback";
import { label } from "@/lib/format";

export function DashboardEvents({
  events,
  admin,
  preview,
}: {
  events: DashboardDto["events"];
  admin: boolean;
  preview: boolean;
}) {
  return (
    <Card className="dashboard-events">
      <CardHeader>
        <CardTitle>On the calendar</CardTitle>
        <CardDescription>
          {admin
            ? "Your community's events, in one place."
            : "A new challenge is better with company."}
        </CardDescription>
        <CardAction>
          <CalendarDays
            className="size-5 text-muted-foreground"
            aria-hidden="true"
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        {events.length ? (
          <ul className="event-agenda">
            {events.slice(0, 3).map((event) => (
              <li key={event.id}>
                <time className="event-date" dateTime={event.startsAt}>
                  <span>
                    {new Date(event.startsAt).toLocaleDateString("en", {
                      month: "short",
                    })}
                  </span>
                  <b>{new Date(event.startsAt).getDate()}</b>
                </time>
                <div className="min-w-0">
                  <p className="font-medium mb-2">
                    {preview ? (
                      event.title
                    ) : (
                      <Link to={`/events/${event.id}`} className="record-title">
                        {event.title}
                      </Link>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        event.status === "active"
                          ? "success"
                          : event.status === "scheduled"
                            ? "info"
                            : "secondary"
                      }
                    >
                      {label(event.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {event.participantCount} players
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            text={
              admin
                ? "No events yet. Create one when your challenges are ready."
                : "When your community schedules an event, you'll find it here."
            }
          />
        )}
      </CardContent>
      {!preview && (
        <CardFooter className="mt-auto">
          <Button variant="outline" asChild className="w-full">
            <Link to="/events">
              Explore events
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
