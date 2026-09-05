import { Link } from "react-router-dom";
import type { DashboardDto, UserDto } from "@flagarena/shared";
import { ArrowUpRight, Flag, Plus, Users } from "lucide-react";
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
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { dateTime, label } from "@/lib/format";
import { DashboardStats } from "./DashboardStats";
import { DashboardProgress } from "./DashboardProgress";
import { DashboardEvents } from "./DashboardEvents";
import { RecentSubmissions } from "./RecentSubmissions";
import "./dashboard.css";

export function DashboardView({
  data,
  user,
  preview = false,
}: {
  data: DashboardDto;
  user: Pick<UserDto, "username" | "role">;
  preview?: boolean;
}) {
  const admin = user.role === "admin";
  const author = user.role === "author";
  return (
    <div className="dashboard-overview">
      <div className="page-heading dashboard-welcome">
        <div>
          <p className="dashboard-eyebrow">
            {admin
              ? "COMMUNITY OVERVIEW"
              : author
                ? "AUTHOR WORKSPACE"
                : "YOUR PRACTICE SPACE"}
          </p>
          <h1>Welcome back, {user.username.split(" ")[0]}.</h1>
          <p className="dashboard-intro">
            {admin
              ? "Keep your community moving. Here's what needs your attention."
              : author
                ? "Turn your next idea into a challenge worth solving."
                : "A little curiosity, a little persistence. What's your next flag?"}
          </p>
        </div>
        {!preview && (
          <Button asChild>
            <Link
              to={
                admin
                  ? "/manage/events/new"
                  : author
                    ? "/manage/challenges/new"
                    : "/challenges"
              }
            >
              {admin || author ? (
                <Plus data-icon="inline-start" />
              ) : (
                <Flag data-icon="inline-start" />
              )}
              {admin
                ? "Create event"
                : author
                  ? "Create challenge"
                  : "Find a challenge"}
            </Link>
          </Button>
        )}
      </div>
      <DashboardStats stats={data.stats} />
      <div className="dashboard-primary-grid">
        <DashboardProgress data={data} admin={admin} preview={preview} />
        <DashboardEvents events={data.events} admin={admin} preview={preview} />
      </div>
      {author && (
        <Card>
          <CardHeader>
            <CardTitle>Your challenge library</CardTitle>
            <CardDescription>
              Keep track of drafts, reviews, and published work.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.challenges.length ? (
              <ul className="review-queue">
                {data.challenges.map((challenge) => (
                  <li key={challenge.id}>
                    <Flag className="size-5 text-violet" aria-hidden="true" />
                    <div className="flex-1">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {challenge.solveCount} solves
                      </p>
                    </div>
                    <ChallengeCategoryBadge category={challenge.category} />
                    <Badge
                      variant={
                        challenge.status === "approved"
                          ? "success"
                          : challenge.status === "pending"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {label(challenge.status)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="Every good puzzle starts with an idea. Create your first challenge." />
            )}
          </CardContent>
        </Card>
      )}
      <RecentSubmissions
        activity={data.activity}
        admin={admin}
        preview={preview}
      />
      {data.hints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>A nudge in the right direction</CardTitle>
            <CardDescription>Your recently unlocked hints.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="record-list vertical-records">
              {data.hints.map((hint, index) => (
                <li key={index}>
                  <strong>{hint.title}</strong>
                  <Badge variant="warning">{hint.cost} points</Badge>
                  <p>{hint.content}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      {admin && (
        <Card>
          <CardHeader>
            <CardTitle>Behind the scenes</CardTitle>
            <CardDescription>
              A record of changes to your arena.
            </CardDescription>
            <CardAction>
              <Users
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
            </CardAction>
          </CardHeader>
          <CardContent>
            {data.audit.length ? (
              <ul className="audit-timeline">
                {data.audit.map((item) => (
                  <li key={item.id}>
                    <span className="audit-dot" aria-hidden="true" />
                    <div>
                      <p className="capitalize">
                        {item.action.replace(/[._]/g, " ")}
                      </p>
                      <span>{item.actorName}</span>
                    </div>
                    <time>{dateTime(item.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState text="Administrative changes will be recorded here." />
            )}
          </CardContent>
          {!preview && (
            <CardFooter>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/audit">
                  Open audit log
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  );
}
