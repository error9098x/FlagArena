import { Link } from "react-router-dom";
import type { DashboardDto } from "@flagarena/shared";
import { ArrowUpRight, Check } from "lucide-react";
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
import { dateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function RecentSubmissions({
  activity,
  admin,
  preview,
}: {
  activity: DashboardDto["activity"];
  admin: boolean;
  preview: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {admin ? "Latest submissions" : "Your recent attempts"}
        </CardTitle>
        <CardDescription>
          {admin
            ? "A snapshot of activity across your community."
            : "The breakthroughs—and the attempts that get you there."}
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{activity.length} recent</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {activity.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {preview ? (
                      item.title
                    ) : (
                      <Link
                        className="record-title"
                        to={`/challenges/${item.challengeId}${item.eventId ? `?eventId=${item.eventId}` : ""}`}
                      >
                        {item.title}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.eventId ? "Event" : "Practice"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={item.result === "correct" ? "success" : "rose"}
                    >
                      {item.result === "correct" ? (
                        <>
                          <Check />
                          Accepted
                        </>
                      ) : (
                        "Incorrect"
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{item.points}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateTime(item.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            text={
              admin
                ? "Your community's attempts will appear here as players start solving."
                : "Nothing submitted yet. Your first attempt is a good place to start."
            }
          />
        )}
      </CardContent>
      {!preview && (
        <CardFooter className="dashboard-card-footer">
          <span>
            {admin
              ? "All players · Most recent first"
              : "Practice and event attempts"}
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/activity">
              View activity
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
