import { Link } from "react-router-dom";
import type { DashboardDto } from "@flagarena/shared";
import { ArrowUpRight, Check, ClipboardCheck } from "lucide-react";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { PracticeScoreChart } from "./PracticeScoreChart";

export function DashboardProgress({
  data,
  admin,
  preview,
}: {
  data: DashboardDto;
  admin: boolean;
  preview: boolean;
}) {
  const pending =
    data.stats.find((stat) => stat.label === "Pending reviews")?.value ?? 0;
  return (
    <Card className="dashboard-main-card">
      <CardHeader>
        <CardTitle>
          {admin ? "Challenge review" : "Your progress, one flag at a time"}
        </CardTitle>
        <CardDescription>
          {admin
            ? "A second pair of eyes before a challenge goes live."
            : "Cumulative practice points · Event scores are tracked separately"}
        </CardDescription>
        <CardAction>
          <Badge variant={admin && pending ? "warning" : "secondary"}>
            {admin ? `${pending} pending` : "Practice"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {admin ? (
          data.challenges.length ? (
            <ul className="review-queue">
              {data.challenges.map((challenge) => (
                <li key={challenge.id}>
                  <span className="queue-icon">
                    <ClipboardCheck aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-medium">
                      {preview ? (
                        challenge.title
                      ) : (
                        <Link
                          className="record-title"
                          to={`/manage/challenges/${challenge.id}`}
                        >
                          {challenge.title}
                        </Link>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {challenge.authorName} · {challenge.basePoints} points
                    </p>
                  </div>
                  <ChallengeCategoryBadge category={challenge.category} />
                  {!preview && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/manage/challenges/${challenge.id}`}>
                        Review
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-success/10 text-success"
                >
                  <Check aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>You're all caught up.</EmptyTitle>
                <EmptyDescription>
                  New challenges appear here when an author submits them for
                  review.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : (
          <PracticeScoreChart points={data.scoreHistory} />
        )}
      </CardContent>
      {admin && (
        <CardFooter className="dashboard-card-footer">
          <span>Review the resources, flag, and hints before approving.</span>
          {!preview && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/manage/challenges">
                Challenge bank
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
