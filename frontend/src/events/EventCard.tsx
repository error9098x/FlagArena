import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Users } from "lucide-react";
import type { EventDto } from "@flagarena/shared";
import { dateTime, label } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export function EventCard({ event }: { event: EventDto }) {
  return (
    <Card>
      <CardHeader>
        <div className="mb-4 flex justify-between items-center">
          <CalendarDays className="size-6 text-primary" aria-hidden="true" />
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
        </div>
        <CardTitle className="text-lg leading-snug">
          <Link className="record-title" to={`/events/${event.id}`}>
            {event.title}
          </Link>
        </CardTitle>
        <CardDescription>
          {label(event.access)} · {event.dynamicScoring ? "Dynamic" : "Fixed"}{" "}
          scoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4">
          <div>
            <dt>Starts</dt>
            <dd>{dateTime(event.startsAt)}</dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>{dateTime(event.endsAt)}</dd>
          </div>
        </dl>
      </CardContent>
      <CardFooter className="mt-auto justify-between gap-3 border-t">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users size={16} aria-hidden="true" />
          {event.participantCount} players{event.registered ? " · Joined" : ""}
        </span>
        <Button variant="secondary" size="sm" asChild>
          <Link to={`/events/${event.id}`}>
            View event
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
