import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScoreHistoryDto } from "@flagarena/shared";
import { EmptyState } from "@/components/Feedback";
import { UserAvatar } from "@/components/UserAvatar";

export function ScoreHistoryChart({ history }: { history: ScoreHistoryDto }) {
  if (!history.players.length)
    return <EmptyState text="The first scored solve starts the chart." />;
  const data = history.points.map((point) => ({
    time: point.time,
    ...point.scores,
  }));
  return (
    <>
      <div
        className="h-72 min-w-0 sm:h-80"
        role="img"
        aria-label="Cumulative score history. Current totals are listed below the chart."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 16, right: 12, bottom: 4, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              stroke="var(--border)"
              vertical={false}
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="time"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(time) =>
                new Date(time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              }
              stroke="var(--muted-foreground)"
              fontSize={11}
              minTickGap={50}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              width={42}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(time) => new Date(Number(time)).toLocaleString()}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                color: "var(--foreground)",
              }}
            />
            {history.players.map((player, index) => (
              <Line
                key={player.userId}
                dataKey={player.userId}
                name={player.username}
                type="stepAfter"
                stroke={`var(--chart-${index + 1})`}
                strokeDasharray={index > 2 ? "6 3" : undefined}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul
        className="flex flex-wrap gap-x-6 gap-y-3 border-t pt-5 mt-3"
        aria-label="Chart players and current scores"
      >
        {history.players.map((player, index) => (
          <li key={player.userId} className="flex items-center gap-2 text-xs">
            <span
              className="h-0.5 w-4"
              style={{ background: `var(--chart-${index + 1})` }}
            />
            <UserAvatar id={player.userId} name={player.username} size="sm" />
            <span>{player.username}</span>
            <span className="font-mono text-muted-foreground">
              {player.points} pts
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
