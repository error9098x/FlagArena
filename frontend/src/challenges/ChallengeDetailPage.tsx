import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  submitFlagSchema,
  type ChallengeDto,
  type HintDto,
  type SubmissionOutcomeDto,
} from "@flagarena/shared";
import { readApi, writeApi, downloadResource } from "@/lib/api";
import { eventQuery, label } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/FormField";
import { Markdown } from "@/components/Markdown";
import { ErrorNotice, Loading, StatusNotice } from "@/components/Feedback";
import { useSession } from "@/auth/SessionProvider";
import { ChallengeReviews } from "./ChallengeReviews";

export function ChallengeDetailPage() {
  const { id = "" } = useParams();
  const [params] = useSearchParams();
  const eventId = params.get("eventId") ?? undefined;
  const { user } = useSession();
  const cache = useQueryClient();
  const [selectedHint, setSelectedHint] = useState<HintDto | null>(null);
  const [downloadError, setDownloadError] = useState<unknown>(null);
  const query = useQuery({
    queryKey: ["challenge", id, eventId],
    queryFn: () => readApi<ChallengeDto>(`/challenges/${id}`, { eventId }),
  });
  const submit = useMutation({
    mutationFn: (form: FormData) =>
      writeApi<SubmissionOutcomeDto>(
        "post",
        `/challenges/${id}/submissions`,
        submitFlagSchema.parse({ flag: form.get("flag"), eventId }),
      ),
    onSuccess: () => cache.invalidateQueries(),
  });
  const unlock = useMutation({
    mutationFn: (hintId: string) =>
      writeApi<HintDto>("post", `/challenges/${id}/hints/${hintId}/unlock`, {
        eventId,
      }),
    onSuccess: async () => {
      setSelectedHint(null);
      await cache.invalidateQueries({ queryKey: ["challenge", id] });
    },
  });
  if (query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const challenge = query.data;
  const canCompete = user?.role !== "admin" && user?.id !== challenge.authorId;
  const result = submit.data;
  const status =
    result?.result === "correct"
      ? `Flag accepted. ${result.pointsAwarded} points awarded.`
      : result?.result === "already_solved"
        ? "Already solved"
        : result
          ? `Incorrect flag. ${result.attemptsRemaining} attempts remaining.`
          : undefined;
  return (
    <>
      <Link
        className="back-link"
        to={eventId ? `/events/${eventId}` : "/challenges"}
      >
        {eventId ? "Event" : "Challenges"}
      </Link>
      <div className="page-heading">
        <h1>{challenge.title}</h1>
        {challenge.solvedByMe && <Badge>Solved</Badge>}
      </div>
      <dl className="metadata-grid">
        <div>
          <dt>Category</dt>
          <dd>{label(challenge.category)}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{label(challenge.difficulty)}</dd>
        </div>
        <div>
          <dt>Points</dt>
          <dd className="font-mono">{challenge.currentPoints}</dd>
        </div>
        <div>
          <dt>Solves</dt>
          <dd className="font-mono">{challenge.solveCount}</dd>
        </div>
        <div>
          <dt>Author</dt>
          <dd>{challenge.authorName}</dd>
        </div>
      </dl>
      <div className="detail-grid">
        <div>
          <section className="panel">
            <h2>Task</h2>
            <Markdown>{challenge.description}</Markdown>
            {challenge.connectionInfo && (
              <>
                <h3>Connection instructions</h3>
                <pre>{challenge.connectionInfo}</pre>
              </>
            )}
            {challenge.resources.length > 0 && (
              <>
                <h3>Resources</h3>
                <ul className="record-list">
                  {challenge.resources.map((resource) => (
                    <li key={resource.id}>
                      <span>{resource.label}</span>
                      {resource.url ? (
                        <Button asChild variant="outline" size="sm">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open resource
                          </a>
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            void downloadResource(
                              resource.id,
                              resource.filename ?? "download",
                              eventId,
                            ).catch(setDownloadError);
                          }}
                        >
                          Download file
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                <ErrorNotice error={downloadError} />
              </>
            )}
          </section>
          <ChallengeReviews challenge={challenge} eventId={eventId} />
        </div>
        <div>
          {canCompete && (
            <section className="panel">
              <h2>Submit flag</h2>
              {challenge.solvedByMe ? (
                <StatusNotice message="Challenge solved" />
              ) : (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    submit.mutate(new FormData(event.currentTarget));
                  }}
                >
                  <FieldGroup>
                    <FormField
                      label="Flag"
                      name="flag"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      maxLength={256}
                    />
                    <ErrorNotice error={submit.error} />
                    <StatusNotice message={status} />
                    {result?.lockedUntil && (
                      <p className="text-destructive">
                        Retry after{" "}
                        {new Date(result.lockedUntil).toLocaleTimeString()}.
                      </p>
                    )}
                    <Button disabled={submit.isPending}>
                      {submit.isPending ? "Checking flag" : "Submit flag"}
                    </Button>
                  </FieldGroup>
                </form>
              )}
            </section>
          )}
          {challenge.hints.length > 0 && (
            <section className="panel">
              <h2>Hints</h2>
              <ul className="hint-list">
                {challenge.hints.map((hint) => (
                  <li key={hint.id}>
                    <div className="flex justify-between gap-3">
                      <strong>Hint {hint.position + 1}</strong>
                      <span className="font-mono text-muted-foreground">
                        {hint.cost} points
                      </span>
                    </div>
                    {hint.content ? (
                      <p>{hint.content}</p>
                    ) : (
                      canCompete && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            unlock.reset();
                            setSelectedHint(hint);
                          }}
                        >
                          Show hint
                        </Button>
                      )
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
      <Dialog
        open={!!selectedHint}
        onOpenChange={(open) => {
          if (!open) setSelectedHint(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Show hint {selectedHint ? selectedHint.position + 1 : ""}
            </DialogTitle>
            <DialogDescription>
              This hint deducts {selectedHint?.cost} points from future solves
              of this challenge.
            </DialogDescription>
          </DialogHeader>
          <ErrorNotice error={unlock.error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedHint(null)}>
              Cancel
            </Button>
            <Button
              disabled={unlock.isPending}
              onClick={() => selectedHint && unlock.mutate(selectedHint.id)}
            >
              Show hint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {eventId && (
        <Link to={`/leaderboard${eventQuery(eventId)}`}>Event leaderboard</Link>
      )}
    </>
  );
}
