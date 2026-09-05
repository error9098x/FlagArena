import { useState } from "react";
import {
  Crown,
  ArrowUpRight,
  Flag,
  Trophy,
  CheckCheck,
  Clock3,
  Users,
} from "lucide-react";
import type { ScoreHistoryDto } from "@flagarena/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserAvatar } from "@/components/UserAvatar";
import { SelectControl } from "@/components/SelectControl";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { ScoreHistoryChart } from "@/leaderboard/ScoreHistoryChart";
import { PracticeScoreChart } from "@/dashboard/PracticeScoreChart";
import {
  Panel,
  PageTitle,
  ChallengeCards,
  type DemoGo,
} from "./DemoChallenges";
import { demoScore, type DemoState } from "./demo-state";

export function ActivityList({
  state,
  compact = false,
  go,
}: {
  state: DemoState;
  compact?: boolean;
  go: DemoGo;
}) {
  return (
    <div className="arena-table-wrap">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Challenge</TableHead>
            <TableHead>Result</TableHead>
            {!compact && <TableHead>Context</TableHead>}
            <TableHead className="text-right">Points</TableHead>
            <TableHead className="text-right">Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {state.attempts.slice(0, compact ? 5 : 100).map((a) => {
            const c = state.challenges.find((c) => c.id === a.challengeId)!;
            return (
              <TableRow key={a.id}>
                <TableCell>
                  <button
                    className="arena-text-action"
                    onClick={() => go("Challenge", c.id, a.eventId)}
                  >
                    {c.title}
                  </button>
                  {!compact && (
                    <div className="mt-2">
                      <ChallengeCategoryBadge category={c.category} />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={a.correct ? "success" : "secondary"}>
                    {a.correct ? "Accepted" : "Incorrect"}
                  </Badge>
                </TableCell>
                {!compact && (
                  <TableCell>
                    {a.eventId
                      ? state.events.find((e) => e.id === a.eventId)?.title
                      : "Practice"}
                  </TableCell>
                )}
                <TableCell className="text-right font-mono text-primary">
                  +{a.points}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(a.at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
export function DemoOverview({ state, go }: { state: DemoState; go: DemoGo }) {
  const role = state.role;
  const score = demoScore(state);
  const solves = new Set(
    state.attempts
      .filter((a) => a.correct && !a.eventId)
      .map((a) => a.challengeId),
  ).size;
  const rank =
    1 + [1950, 1650, 1250, 450, 350].filter((points) => points > score).length;
  const pending = state.challenges.filter((c) => c.status === "pending");
  const stats =
    role === "player"
      ? [
          { label: "Practice score", value: score, icon: Trophy },
          { label: "Challenges solved", value: solves, icon: CheckCheck },
          { label: "Practice rank", value: `#${rank}`, icon: Flag },
          { label: "Submissions", value: state.attempts.length, icon: Clock3 },
        ]
      : [
          {
            label: "Published",
            value: state.challenges.filter((c) => c.status === "approved")
              .length,
            icon: Flag,
          },
          { label: "In review", value: pending.length, icon: Clock3 },
          {
            label: role === "admin" ? "Members" : "Total solves",
            value:
              role === "admin"
                ? state.users.length
                : state.challenges.reduce((s, c) => s + c.solves, 0),
            icon: Users,
          },
          {
            label: "Active events",
            value: state.events.filter((e) => e.status === "active").length,
            icon: Trophy,
          },
        ];
  const scoreDates = [
    ...new Set([
      "2026-08-31",
      ...state.attempts.filter((a) => !a.eventId).map((a) => a.at.slice(0, 10)),
    ]),
  ].sort();
  const scorePoints = scoreDates.map((date) => ({
    date,
    points: state.attempts
      .filter((a) => !a.eventId && a.at.slice(0, 10) <= date)
      .reduce((sum, a) => sum + a.points, 0),
  }));
  return (
    <>
      <PageTitle
        title={
          role === "player"
            ? "Overview"
            : role === "author"
              ? "Author workspace"
              : "Administration"
        }
      >
        <Button
          onClick={() =>
            go(
              role === "player"
                ? "Challenges"
                : role === "author"
                  ? "Create challenge"
                  : "Users",
            )
          }
        >
          {role === "player"
            ? "Browse challenges"
            : role === "author"
              ? "Create challenge"
              : "Manage users"}
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </PageTitle>
      <div className="arena-stats">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="arena-overview-grid">
        <Panel
          title={role === "player" ? "Practice score" : "Player score history"}
        >
          <PracticeScoreChart points={scorePoints} />
        </Panel>
        <Panel
          title={role === "admin" ? "Review queue" : "Upcoming events"}
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => go(role === "admin" ? "Review queue" : "Events")}
            >
              View all
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          }
        >
          <div className="arena-compact-list">
            {role === "admin"
              ? pending.map((c) => (
                  <button key={c.id} onClick={() => go("Challenge", c.id)}>
                    <ChallengeCategoryBadge category={c.category} />
                    <strong>{c.title}</strong>
                    <span>{c.points} pts</span>
                  </button>
                ))
              : state.events
                  .filter((e) => e.status !== "ended")
                  .map((e) => (
                    <button key={e.id} onClick={() => go("Event", e.id)}>
                      <div className="arena-date-tile">
                        <span>SEP</span>
                        <strong>{e.starts.slice(8, 10)}</strong>
                      </div>
                      <div>
                        <strong>{e.title}</strong>
                        <small>{e.participants} participants</small>
                      </div>
                      <Badge
                        variant={
                          e.status === "active" ? "success" : "secondary"
                        }
                      >
                        {e.status === "active" ? "Live" : "Upcoming"}
                      </Badge>
                    </button>
                  ))}
          </div>
        </Panel>
      </div>
      {role === "player" ? (
        <Panel
          title="Recent submissions"
          action={
            <Button variant="ghost" size="sm" onClick={() => go("Activity")}>
              View activity
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          }
        >
          <ActivityList state={state} compact go={go} />
        </Panel>
      ) : (
        <Panel title="Recent activity">
          <AuditList state={state} />
        </Panel>
      )}
      <div className="arena-section-heading">
        <h2>
          {role === "player" ? "Continue practicing" : "Challenge library"}
        </h2>
        <Button variant="ghost" size="sm" onClick={() => go("Challenges")}>
          View all
          <ArrowUpRight data-icon="inline-end" />
        </Button>
      </div>
      <ChallengeCards
        state={state}
        go={go}
        challenges={state.challenges
          .filter((c) => c.status === "approved")
          .slice(0, 3)}
      />
    </>
  );
}
export function DemoLeaderboard({
  state,
  go,
  eventId,
}: {
  state: DemoState;
  go: DemoGo;
  eventId?: string;
}) {
  const score = demoScore(state, eventId);
  const event = state.events.find((e) => e.id === eventId);
  const eventChallenges = state.challenges.filter((c) =>
    event?.challenges.includes(c.id),
  );
  const players = [
    { name: "Nisha Rao", points: 1950, solves: 9 },
    { name: "Mira Shah", points: 1650, solves: 8 },
    { name: "Dev Kapoor", points: 1250, solves: 6 },
    { name: "Arjun Mehta", points: score, solves: 0 },
    { name: "Rhea Sen", points: 450, solves: 3 },
    { name: "Kabir Sethi", points: 350, solves: 2 },
  ]
    .map((p, i) => {
      if (!event || p.name === "Arjun Mehta") return p;
      const completed =
        event.status === "scheduled" || event.participants === 0
          ? []
          : eventChallenges.slice(0, Math.max(1, eventChallenges.length - i));
      return {
        ...p,
        points: completed.reduce((sum, c) => sum + c.points, 0),
        solves: completed.length,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((p, i) => ({
      userId: p.name,
      username: p.name,
      points: p.points,
      rank: i + 1,
      solveCount:
        p.name === "Arjun Mehta"
          ? new Set(
              state.attempts
                .filter((a) => a.correct && a.eventId === eventId)
                .map((a) => a.challengeId),
            ).size
          : p.solves,
      lastSolveAt: "2026-09-05T12:00:00Z",
    }));
  const [selected, setSelected] = useState(
    players.slice(0, 3).map((p) => p.userId),
  );
  const chartPlayers = players.filter((p) => selected.includes(p.userId));
  const history: ScoreHistoryDto = {
    players: chartPlayers,
    me: players.find((p) => p.username === "Arjun Mehta")!,
    live: false,
    points: Array.from({ length: 10 }, (_, i) => ({
      time: new Date(
        `2026-09-05T${String(i + 3).padStart(2, "0")}:00:00Z`,
      ).getTime(),
      scores: Object.fromEntries(
        chartPlayers.map((p, j) => [
          p.userId,
          i === 9
            ? p.points
            : Math.round((p.points * Math.max(0, i - j * 0.45)) / 9),
        ]),
      ),
    })),
  };
  return (
    <>
      <PageTitle title={eventId ? "Event standings" : "Leaderboard"} />
      <div className="arena-podium">
        {[players[1]!, players[0]!, players[2]!].map((p) => (
          <div key={p.userId} className={`arena-podium-place place-${p.rank}`}>
            <span className="arena-podium-rank">
              {p.rank === 1 ? (
                <Crown size={22} />
              ) : (
                String(p.rank).padStart(2, "0")
              )}
            </span>
            <UserAvatar id={p.userId} name={p.username} size="lg" />
            <strong>{p.username}</strong>
            <span className="arena-points">
              <strong>{p.points.toLocaleString()}</strong>
              <span>pts</span>
            </span>
            <small>{p.solveCount} solves</small>
          </div>
        ))}
      </div>
      <Panel title="Score history">
        <ScoreHistoryChart history={history} />
      </Panel>
      <Panel title="Standings">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Compare</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Solves</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.map((p) => (
              <TableRow key={p.userId}>
                <TableCell>
                  <input
                    type="checkbox"
                    aria-label={`Compare ${p.username}`}
                    checked={selected.includes(p.userId)}
                    disabled={
                      selected.length === 1 && selected.includes(p.userId)
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, p.userId]
                          : selected.filter((id) => id !== p.userId),
                      )
                    }
                  />
                </TableCell>
                <TableCell className="font-mono">{p.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar id={p.userId} name={p.username} />
                    {p.username}
                    {p.username === "Arjun Mehta" && (
                      <Badge variant="secondary">You</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{p.solveCount}</TableCell>
                <TableCell className="text-right font-mono text-primary">
                  {p.points.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Panel title="Recent submissions">
        <ActivityList state={state} go={go} compact />
      </Panel>
    </>
  );
}
export function AuditList({ state }: { state: DemoState }) {
  return (
    <div className="arena-audit-list">
      {state.audit.map((a, i) => (
        <div key={`${a.at}-${i}`}>
          <span className="arena-audit-dot" />
          <p>{a.text}</p>
          <time>
            {new Date(a.at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </time>
        </div>
      ))}
    </div>
  );
}
export function DemoAnalytics({ state, go }: { state: DemoState; go: DemoGo }) {
  const [sort, setSort] = useState("completion");
  const published = state.challenges.filter((c) => c.status === "approved");
  const completion = (c: (typeof published)[number]) =>
    c.performance?.players ? c.solves / c.performance.players : 0;
  const hintRate = (c: (typeof published)[number]) =>
    c.performance?.players
      ? c.performance.hintUsers / c.performance.players
      : 0;
  const challenges = [...published].sort((a, b) => {
    if (!a.performance || !b.performance)
      return Number(!!b.performance) - Number(!!a.performance);
    return sort === "hints"
      ? hintRate(b) - hintRate(a)
      : sort === "players"
        ? b.performance.players - a.performance.players
        : completion(a) - completion(b);
  });
  const signals = published
    .filter((c) => c.performance && (completion(c) < 0.25 || hintRate(c) > 0.5))
    .sort((a, b) => completion(a) - completion(b));
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  return (
    <>
      <PageTitle title="Challenge performance" />
      {signals.length > 0 && (
        <Panel title="Difficulty signals">
          <div className="arena-performance-signals">
            {signals.map((c) => (
              <div key={c.id}>
                <Flag size={18} aria-hidden="true" />
                <div>
                  <strong>{c.title}</strong>
                  <p>
                    {completion(c) < 0.25
                      ? `${c.solves} of ${c.performance!.players} players solved it`
                      : `${c.performance!.hintUsers} of ${c.performance!.players} players opened a hint`}
                  </p>
                </div>
                <Badge variant="secondary">
                  {completion(c) < 0.25 ? "Low completion" : "High hint use"}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => go("Challenge", c.id)}
                  aria-label={`Review ${c.title}`}
                >
                  Review
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel
        title="Published challenges"
        action={
          <SelectControl
            aria-label="Sort challenge performance"
            className="w-[190px] shrink-0"
            value={sort}
            onValueChange={setSort}
            options={[
              { value: "completion", label: "Lowest completion" },
              { value: "hints", label: "Most hint use" },
              { value: "players", label: "Most players" },
            ]}
          />
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Challenge</TableHead>
              <TableHead
                className="text-right"
                title="Players who submitted at least one flag"
              >
                Players
              </TableHead>
              <TableHead className="text-right">Solved</TableHead>
              <TableHead
                className="text-right"
                title="Solved divided by players who attempted the challenge"
              >
                Completion
              </TableHead>
              <TableHead
                className="text-right"
                title="Median time from first attempt to accepted flag"
              >
                Median time
              </TableHead>
              <TableHead
                className="text-right"
                title="Percentage of players who opened a hint"
              >
                Hint use
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <button
                    className="arena-text-action"
                    onClick={() => go("Challenge", c.id)}
                  >
                    {c.title}
                  </button>
                  <div className="mt-2">
                    <ChallengeCategoryBadge category={c.category} />
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.performance?.players ?? "—"}
                </TableCell>
                <TableCell className="text-right">{c.solves}</TableCell>
                <TableCell className="text-right tabular-nums text-primary">
                  {c.performance ? percent(completion(c)) : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {c.performance ? `${c.performance.medianMinutes} min` : "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {c.performance ? percent(hintRate(c)) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </>
  );
}
