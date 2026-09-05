import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type {
  LeaderboardRowDto,
  PageDto,
  ScoreHistoryDto,
} from "@flagarena/shared";
import { useSession } from "@/auth/SessionProvider";
import { readApi } from "@/lib/api";
import { dateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/FormField";
import { FieldGroup } from "@/components/ui/field";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";
import { UserAvatar } from "@/components/UserAvatar";
import { ScoreHistoryChart } from "./ScoreHistoryChart";

export function LeaderboardPage() {
  const [params] = useSearchParams();
  const eventId = params.get("eventId") ?? undefined;
  return (
    <>
      <h1>{eventId ? "Event leaderboard" : "Practice leaderboard"}</h1>
      {eventId && (
        <Link className="back-link" to={`/events/${eventId}`}>
          Back to event
        </Link>
      )}
      <Leaderboard key={eventId ?? "practice"} eventId={eventId} />
    </>
  );
}

export function Leaderboard({ eventId }: { eventId?: string }) {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[] | undefined>();
  const history = useQuery({
    queryKey: ["score-history", eventId, selected],
    queryFn: () =>
      readApi<ScoreHistoryDto>("/leaderboard/history", {
        eventId,
        players: selected?.join(","),
      }),
    refetchInterval: (query) =>
      !eventId || query.state.data?.live ? 15000 : false,
  });
  const query = useQuery({
    queryKey: ["leaderboard", eventId, page, search],
    queryFn: () =>
      readApi<PageDto<LeaderboardRowDto>>("/leaderboard", {
        eventId,
        page,
        search,
      }),
    refetchInterval: !eventId || history.data?.live ? 15000 : false,
  });
  const ids =
    selected ?? history.data?.players.map((player) => player.userId) ?? [];
  return (
    <>
      {user?.role !== "admin" && history.data && (
        <dl className="stats-grid">
          <div>
            <dt>Your rank</dt>
            <dd>
              {history.data.me?.rank ? `#${history.data.me.rank}` : "Unranked"}
            </dd>
          </div>
          <div>
            <dt>Your points</dt>
            <dd>{history.data.me?.points ?? 0}</dd>
          </div>
          <div>
            <dt>Your solves</dt>
            <dd>{history.data.me?.solveCount ?? 0}</dd>
          </div>
        </dl>
      )}
      <section className="panel" aria-labelledby="score-history-title">
        <div className="section-heading">
          <h2 id="score-history-title">Score progression</h2>
          <span className="text-xs text-muted-foreground">
            {history.data?.live
              ? "Live · updates every 15s"
              : eventId
                ? "Event history"
                : "Practice history"}
          </span>
        </div>
        <ErrorNotice error={history.error} />
        {history.isPending ? (
          <Loading />
        ) : (
          history.data && <ScoreHistoryChart history={history.data} />
        )}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Compare up to six players. Defaults to the top five and you. Scores
            reflect corrections.
          </p>
          {selected && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(undefined)}
            >
              Reset comparison
            </Button>
          )}
        </div>
      </section>
      <form
        className="mb-6 max-w-md"
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(
            String(new FormData(event.currentTarget).get("search") ?? ""),
          );
          setPage(1);
        }}
      >
        <FieldGroup className="flex-row items-end">
          <FormField
            label="Find a player"
            name="search"
            placeholder="Display name"
            maxLength={32}
          />
          <Button variant="secondary">Search</Button>
        </FieldGroup>
      </form>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Compare</TableHead>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Solves</TableHead>
                <TableHead>Last scoring solve</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow
                  key={row.userId}
                  className={
                    row.userId === user?.id ? "bg-primary/5" : undefined
                  }
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      aria-label={`Compare ${row.username}`}
                      checked={ids.includes(row.userId)}
                      disabled={
                        (!ids.includes(row.userId) && ids.length >= 6) ||
                        (ids.includes(row.userId) && ids.length === 1)
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? [...ids, row.userId]
                            : ids.filter((id) => id !== row.userId),
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-mono">#{row.rank}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-3">
                      <UserAvatar id={row.userId} name={row.username} />
                      <span>
                        {row.username}
                        {row.userId === user?.id && (
                          <span className="text-muted-foreground"> (you)</span>
                        )}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-primary">
                    {row.points}
                  </TableCell>
                  <TableCell>{row.solveCount}</TableCell>
                  <TableCell>{dateTime(row.lastSolveAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && (
          <EmptyState
            text={
              search ? "No players match this name." : "No scored solves yet."
            }
          />
        )
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
    </>
  );
}
