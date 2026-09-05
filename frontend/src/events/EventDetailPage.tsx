import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventDto, ScoreHistoryDto } from "@flagarena/shared";
import { CalendarDays } from "lucide-react";
import { useSession } from "@/auth/SessionProvider";
import { readApi, writeApi } from "@/lib/api";
import { dateTime, label } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FieldGroup } from "@/components/ui/field";
import { FormField } from "@/components/FormField";
import { Markdown } from "@/components/Markdown";
import { ErrorNotice, Loading } from "@/components/Feedback";
import { EventChallengeList } from "./EventChallengeList";
import { Leaderboard } from "@/leaderboard/LeaderboardPage";

export function EventDetailPage() {
  const { id = "" } = useParams();
  const { user } = useSession();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["event", id],
    queryFn: () => readApi<EventDto>(`/events/${id}`),
    refetchInterval: 15000,
  });
  const event = query.data;
  const canView =
    !!event &&
    (user?.role === "admin" || (event.registered && event.status === "active"));
  const canViewScores =
    !!event &&
    (user?.role === "admin" ||
      (event.registered &&
        ["active", "ended", "archived"].includes(event.status)));
  const history = useQuery({
    queryKey: ["score-history", id, undefined],
    queryFn: () =>
      readApi<ScoreHistoryDto>("/leaderboard/history", { eventId: id }),
    enabled: canViewScores,
    refetchInterval: event?.status === "active" ? 15000 : false,
  });
  const join = useMutation({
    mutationFn: (form: FormData) =>
      writeApi("post", `/events/${id}/join`, {
        code: form.get("code") || undefined,
      }),
    onSuccess: () => cache.invalidateQueries(),
  });
  if (query.isPending) return <Loading />;
  if (query.error || !event) return <ErrorNotice error={query.error} />;
  return (
    <>
      <Link className="back-link" to="/events">
        Back to events
      </Link>
      <section className="panel">
        <div className="mb-6 flex items-center gap-3">
          <CalendarDays className="size-6 text-primary" aria-hidden="true" />
          <Badge variant={event.status === "active" ? "default" : "outline"}>
            {label(event.status)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {label(event.access)} · Individual participation
          </span>
        </div>
        <div className="page-heading">
          <h1>{event.title}</h1>
          {user?.role === "admin" && (
            <Button variant="outline" asChild>
              <Link to={`/manage/events/${id}`}>Manage event</Link>
            </Button>
          )}
        </div>
        <dl className="grid gap-6 sm:grid-cols-3 border-t pt-6">
          <div>
            <dt>Starts</dt>
            <dd>{dateTime(event.startsAt)}</dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>{dateTime(event.endsAt)}</dd>
          </div>
          <div>
            <dt>Scoring</dt>
            <dd>{event.dynamicScoring ? "Dynamic" : "Fixed"} points</dd>
          </div>
        </dl>
      </section>
      <dl className="stats-grid">
        <div>
          <dt>Registered players</dt>
          <dd>{event.participantCount}</dd>
        </div>
        <div>
          <dt>Your participation</dt>
          <dd className="!text-xl">
            {user?.role === "admin"
              ? "Organizer"
              : event.registered
                ? "Joined"
                : "Not joined"}
          </dd>
        </div>
        {canViewScores && user?.role !== "admin" && (
          <>
            <div>
              <dt>Your points</dt>
              <dd>{history.data?.me?.points ?? 0}</dd>
            </div>
            <div>
              <dt>Your rank</dt>
              <dd>{history.data?.me ? `#${history.data.me.rank}` : "—"}</dd>
            </div>
          </>
        )}
      </dl>
      {user?.role !== "admin" &&
        !event.registered &&
        ["scheduled", "active"].includes(event.status) && (
          <section className="panel">
            <h2>Ready to join?</h2>
            <p className="mb-5 text-muted-foreground">
              {event.access === "invite_only"
                ? "Enter the join code shared by your organizer."
                : "Join this event to access its challenges when it starts."}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                join.mutate(new FormData(e.currentTarget));
              }}
            >
              <FieldGroup className="max-w-sm">
                {event.access === "invite_only" && (
                  <FormField
                    label="Join code"
                    name="code"
                    type="password"
                    autoComplete="off"
                    required
                  />
                )}
                <ErrorNotice error={join.error} />
                <Button disabled={join.isPending}>
                  {join.isPending ? "Joining" : "Join event"}
                </Button>
              </FieldGroup>
            </form>
          </section>
        )}
      {event.registered && event.status === "scheduled" && (
        <p className="mb-6 text-muted-foreground">
          You're registered. Challenges open at {dateTime(event.startsAt)}.
        </p>
      )}
      {["ended", "archived"].includes(event.status) && (
        <p className="mb-6 text-muted-foreground">
          This event has ended. Submissions are closed; final standings and
          score history remain available to participants.
        </p>
      )}
      <Tabs defaultValue="overview" key={id}>
        <TabsList className="mb-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="challenges" disabled={!canView}>
            Challenges
          </TabsTrigger>
          <TabsTrigger value="leaderboard" disabled={!canViewScores}>
            Leaderboard
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <section className="panel">
            <h2>About this event</h2>
            <Markdown>{event.description}</Markdown>
            {event.rules && (
              <>
                <h3>Rules</h3>
                <Markdown>{event.rules}</Markdown>
              </>
            )}
            {event.dynamicScoring && (
              <p className="text-muted-foreground">
                Points decrease by 5% of the base per previous solve, down to
                50%. Existing awards stay unchanged.
              </p>
            )}
          </section>
        </TabsContent>
        <TabsContent value="challenges">
          {canView && <EventChallengeList eventId={id} />}
        </TabsContent>
        <TabsContent value="leaderboard">
          {canViewScores && <Leaderboard eventId={id} />}
        </TabsContent>
      </Tabs>
    </>
  );
}
