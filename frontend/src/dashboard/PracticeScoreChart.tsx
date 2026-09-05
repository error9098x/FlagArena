import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardDto } from "@flagarena/shared";
import { EmptyState } from "@/components/Feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function PracticeScoreChart({
  points,
}: {
  points: DashboardDto["scoreHistory"];
}) {
  const fillId = useId().replace(/:/g, "");
  if (!points.length)
    return (
      <EmptyState text="Your first accepted flag starts the story. Browse a challenge to begin." />
    );
  return (
    <>
      <div className="score-chart" aria-label="Cumulative practice score">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart
            data={points}
            margin={{ left: 0, right: 14, bottom: 10, top: 15 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity={0.2}
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="3 5"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickFormatter={(date) => String(date).slice(5)}
              axisLine={false}
              tickLine={false}
              minTickGap={35}
            />
            <YAxis
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            />
            <Area
              isAnimationActive={false}
              dataKey="points"
              name="Points"
              type="stepAfter"
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${fillId})`}
              dot={points.length === 1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="score-data">
        <summary>View score data</summary>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((point) => (
              <TableRow key={point.date}>
                <TableCell>{point.date}</TableCell>
                <TableCell>{point.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </>
  );
}
