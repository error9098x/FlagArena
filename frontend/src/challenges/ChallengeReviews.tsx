import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReviewSchema,
  type ChallengeDto,
  type PageDto,
  type ReviewDto,
} from "@flagarena/shared";
import { useSession } from "@/auth/SessionProvider";
import { readApi, writeApi } from "@/lib/api";
import { dateTime, eventQuery } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormField, SelectField, TextField } from "@/components/FormField";
import { EmptyState, ErrorNotice, StatusNotice } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";
import { UserAvatar } from "@/components/UserAvatar";

export function ChallengeReviews({
  challenge,
  eventId,
}: {
  challenge: ChallengeDto;
  eventId?: string;
}) {
  const { user } = useSession();
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["reviews", challenge.id, eventId, page],
    queryFn: () =>
      readApi<PageDto<ReviewDto>>(`/challenges/${challenge.id}/reviews`, {
        eventId,
        page,
      }),
  });
  const personal = useQuery({
    queryKey: ["my-review", challenge.id, eventId],
    queryFn: () =>
      readApi<{ review: ReviewDto | null; canReview: boolean }>(
        `/challenges/${challenge.id}/my-review`,
        { eventId },
      ),
  });
  const save = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "put",
        `/challenges/${challenge.id}/review${eventQuery(eventId)}`,
        createReviewSchema.parse(Object.fromEntries(form)),
      ),
    onSuccess: () => cache.invalidateQueries(),
  });
  const remove = useMutation({
    mutationFn: () => writeApi("delete", `/challenges/${challenge.id}/review`),
    onSuccess: () => cache.invalidateQueries(),
  });
  const hide = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      writeApi("post", `/reviews/${id}/hide`, { reason }),
    onSuccess: () => cache.invalidateQueries(),
  });
  const own = personal.data?.review;
  const canReview = personal.data?.canReview;
  return (
    <section className="panel">
      <h2>Reviews</h2>
      <ErrorNotice
        error={
          query.error ||
          personal.error ||
          save.error ||
          remove.error ||
          hide.error
        }
      />
      <StatusNotice message={save.data?.message || hide.data?.message} />
      {query.data?.items.length ? (
        <ul className="review-list">
          {query.data.items.map((review) => (
            <li key={review.id}>
              <div className="flex justify-between gap-4">
                <span className="flex items-center gap-3">
                  <UserAvatar id={review.userId} name={review.username} />
                  <strong>{review.username}</strong>
                </span>
                <span>{review.rating} / 5</span>
              </div>
              <p>{review.comment}</p>
              <time className="text-muted-foreground text-xs">
                {dateTime(review.createdAt)}
              </time>
              {review.hidden && <p>Hidden</p>}
              {user?.role === "admin" && !review.hidden && (
                <details>
                  <summary>Moderate review</summary>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      hide.mutate({
                        id: review.id,
                        reason: String(
                          new FormData(e.currentTarget).get("reason"),
                        ),
                      });
                    }}
                  >
                    <FieldGroup>
                      <FormField
                        label="Reason"
                        name="reason"
                        id={`reason-${review.id}`}
                        minLength={3}
                        required
                      />
                      <Button variant="destructive" disabled={hide.isPending}>
                        Hide review
                      </Button>
                    </FieldGroup>
                  </form>
                </details>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState text="No reviews" />
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
      {(canReview || own) && (
        <form
          key={own?.id ?? "new"}
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(new FormData(e.currentTarget));
          }}
          className="mt-6"
        >
          <FieldGroup>
            {own?.hidden && (
              <p>
                This review is hidden by an Admin. Editing does not restore its
                visibility.
              </p>
            )}
            <SelectField
              label="Your rating"
              name="rating"
              defaultValue={String(own?.rating ?? 5)}
              options={[1, 2, 3, 4, 5].map((value) => ({
                value: String(value),
                label: String(value),
              }))}
            />
            <TextField
              label="Comment"
              name="comment"
              maxLength={1000}
              defaultValue={own?.comment ?? ""}
            />
            <div className="flex gap-3">
              <Button disabled={save.isPending || !canReview}>
                Save review
              </Button>
              {own && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  Delete review
                </Button>
              )}
            </div>
          </FieldGroup>
        </form>
      )}
    </section>
  );
}
