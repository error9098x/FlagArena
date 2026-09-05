import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { correctScoreSchema, type PageDto } from "@flagarena/shared";
import { readApi, writeApi } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField } from "@/components/FormField";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";

interface Solve {
  id: string;
  username: string;
  title: string;
  context: string;
  points: number;
  originalPoints: number;
  invalidated: boolean;
  createdAt: string;
}
export function ScoreCorrections() {
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Solve | null>(null);
  const query = useQuery({
    queryKey: ["solves", page],
    queryFn: () => readApi<PageDto<Solve>>("/admin/solves", { page }),
  });
  const mutation = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "patch",
        `/admin/solves/${editing?.id}`,
        correctScoreSchema.parse({
          ...Object.fromEntries(form),
          invalidated: form.get("invalidated") === "on",
        }),
      ),
    onSuccess: async () => {
      setEditing(null);
      await cache.invalidateQueries();
    },
  });
  return (
    <>
      <h1>Score corrections</h1>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Original points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((solve) => (
                <TableRow key={solve.id}>
                  <TableCell>{solve.username}</TableCell>
                  <TableCell>{solve.title}</TableCell>
                  <TableCell>
                    {solve.context === "practice" ? "Practice" : solve.context}
                  </TableCell>
                  <TableCell>{solve.points}</TableCell>
                  <TableCell>{solve.originalPoints}</TableCell>
                  <TableCell>
                    {solve.invalidated ? "Invalidated" : "Valid"}
                  </TableCell>
                  <TableCell>{dateTime(solve.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        mutation.reset();
                        setEditing(solve);
                      }}
                    >
                      Correct score
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && <EmptyState text="No scored solves" />
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correct score</DialogTitle>
            <DialogDescription>
              {editing?.username}: {editing?.title}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              key={editing.id}
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate(new FormData(e.currentTarget));
              }}
            >
              <FieldGroup>
                <FormField
                  label="Points"
                  name="points"
                  type="number"
                  min="0"
                  max="10000"
                  defaultValue={editing.points}
                  required
                />
                <Field orientation="horizontal">
                  <input
                    id="invalidate-solve"
                    type="checkbox"
                    name="invalidated"
                    defaultChecked={editing.invalidated}
                  />
                  <FieldLabel htmlFor="invalidate-solve">
                    Invalidate solve
                  </FieldLabel>
                </Field>
                <FormField
                  label="Reason"
                  name="reason"
                  minLength={3}
                  required
                />
                <ErrorNotice error={mutation.error} />
                <Button disabled={mutation.isPending}>Save correction</Button>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
