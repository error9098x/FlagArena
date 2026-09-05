import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { textCorrectionSchema, type ChallengeDto } from "@flagarena/shared";
import { useSession } from "@/auth/SessionProvider";
import { writeApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormField, TextField } from "@/components/FormField";
import { ErrorNotice, StatusNotice } from "@/components/Feedback";

export function ChallengeModeration({
  challenge,
}: {
  challenge: ChallengeDto;
}) {
  const { user } = useSession();
  const cache = useQueryClient();
  const [reason, setReason] = useState("");
  const mutate = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: unknown }) =>
      writeApi("post", `/challenges/${challenge.id}/${action}`, body),
    onSuccess: () => cache.invalidateQueries(),
  });
  const correct = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "patch",
        `/challenges/${challenge.id}/text`,
        textCorrectionSchema.parse(Object.fromEntries(form)),
      ),
    onSuccess: () => cache.invalidateQueries(),
  });
  const editable =
    ["draft", "rejected"].includes(challenge.status) && !challenge.releasedAt;
  return (
    <section className="panel">
      <h2>Publication</h2>
      {challenge.rejectionReason && (
        <StatusNotice message={challenge.rejectionReason} />
      )}
      <ErrorNotice error={mutate.error || correct.error} />
      <StatusNotice message={mutate.data?.message || correct.data?.message} />
      <div className="flex flex-wrap gap-3">
        {editable && (
          <Button
            disabled={mutate.isPending}
            onClick={() => mutate.mutate({ action: "submit-review" })}
          >
            Submit for review
          </Button>
        )}
        {user?.role === "admin" &&
          (challenge.status === "pending" ||
            challenge.status === "disabled" ||
            (challenge.status === "draft" &&
              challenge.authorId === user.id)) && (
            <Button
              disabled={mutate.isPending}
              onClick={() =>
                mutate.mutate({
                  action: "moderate",
                  body: { status: "approved" },
                })
              }
            >
              Approve challenge
            </Button>
          )}
        {user?.role === "admin" &&
          challenge.status === "approved" &&
          challenge.visibility === "event_only" && (
            <Button
              variant="outline"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate({ action: "publish-practice" })}
            >
              Publish to practice
            </Button>
          )}
      </div>
      {user?.role === "admin" && challenge.status !== "archived" && (
        <>
          <FieldGroup className="mt-6">
            <FormField
              label="Moderation reason"
              id="moderation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-3">
              {(challenge.status === "pending"
                ? ["rejected", "disabled", "archived"]
                : ["disabled", "archived"]
              ).map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  disabled={reason.trim().length < 3 || mutate.isPending}
                  onClick={() =>
                    mutate.mutate({
                      action: "moderate",
                      body: { status, reason },
                    })
                  }
                >
                  {status === "rejected"
                    ? "Reject challenge"
                    : status === "disabled"
                      ? "Disable challenge"
                      : "Archive challenge"}
                </Button>
              ))}
            </div>
          </FieldGroup>
          {challenge.releasedAt && (
            <details className="mt-6">
              <summary>Correct published text</summary>
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  correct.mutate(new FormData(e.currentTarget));
                }}
              >
                <FieldGroup>
                  <FormField
                    label="Title"
                    name="title"
                    id="correction-title"
                    defaultValue={challenge.title}
                    required
                  />
                  <TextField
                    label="Task (Markdown)"
                    name="description"
                    id="correction-description"
                    defaultValue={challenge.description}
                    required
                  />
                  <TextField
                    label="Connection instructions"
                    name="connectionInfo"
                    id="correction-connection"
                    defaultValue={challenge.connectionInfo}
                  />
                  <FormField
                    label="Reason"
                    name="reason"
                    id="correction-reason"
                    minLength={3}
                    required
                  />
                  <Button disabled={correct.isPending}>Save correction</Button>
                </FieldGroup>
              </form>
            </details>
          )}
        </>
      )}
    </section>
  );
}
