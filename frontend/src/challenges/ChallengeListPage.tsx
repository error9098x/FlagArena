import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_STATUSES,
  VISIBILITIES,
  type ChallengeDto,
  type PageDto,
} from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { eventQuery, label } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormField, SelectField } from "@/components/FormField";
import { Pagination } from "@/components/Pagination";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";

const options = (values: readonly string[], all: string) => [
  { value: "", label: all },
  ...values.map((value) => ({ value, label: label(value) })),
];
export function ChallengeListPage({ manage = false }: { manage?: boolean }) {
  const [params] = useSearchParams();
  const eventId = params.get("eventId") ?? undefined;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const authors = useQuery({
    queryKey: ["challenge-authors"],
    queryFn: () =>
      readApi<{ id: string; username: string }[]>("/challenges/authors"),
    enabled: manage,
  });
  const query = useQuery({
    queryKey: ["challenges", manage, eventId, page, filters],
    queryFn: () =>
      readApi<PageDto<ChallengeDto>>("/challenges", {
        view: manage ? "manage" : "practice",
        eventId,
        page,
        ...filters,
      }),
  });
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters(
      Object.fromEntries(
        [...new FormData(event.currentTarget).entries()].filter(
          ([, value]) => value !== "",
        ),
      ) as Record<string, string>,
    );
  }
  return (
    <>
      <div className="page-heading">
        <h1>{manage ? "Challenge bank" : "Challenges"}</h1>
        {manage && (
          <Button asChild>
            <Link to="/manage/challenges/new">Create challenge</Link>
          </Button>
        )}
      </div>
      <form className="filter-bar" onSubmit={filter}>
        <FieldGroup className="filter-fields">
          <FormField label="Search" name="search" type="search" />
          <SelectField
            label="Category"
            name="category"
            options={options(CHALLENGE_CATEGORIES, "All categories")}
          />
          <SelectField
            label="Difficulty"
            name="difficulty"
            options={options(CHALLENGE_DIFFICULTIES, "All difficulties")}
          />
          <SelectField
            label="Sort"
            name="sortBy"
            options={[
              { value: "createdAt", label: "Newest" },
              { value: "points", label: "Points" },
              { value: "solveCount", label: "Solves" },
              { value: "title", label: "Title" },
            ]}
          />
          <Button>Apply filters</Button>
        </FieldGroup>
        <details className="mt-4">
          <summary>More filters</summary>
          <FieldGroup className="filter-fields mt-4">
            <FormField
              label="Minimum points"
              name="minPoints"
              type="number"
              min="0"
            />
            <FormField
              label="Maximum points"
              name="maxPoints"
              type="number"
              min="0"
            />
            <FormField
              label="Minimum solves"
              name="minSolves"
              type="number"
              min="0"
            />
            <FormField
              label="Maximum solves"
              name="maxSolves"
              type="number"
              min="0"
            />
            {manage ? (
              <>
                <SelectField
                  label="Status"
                  name="status"
                  options={options(CHALLENGE_STATUSES, "All statuses")}
                />
                <SelectField
                  label="Visibility"
                  name="visibility"
                  options={options(VISIBILITIES, "All visibility")}
                />
                <SelectField
                  label="Author"
                  name="authorId"
                  options={[
                    { value: "", label: "All authors" },
                    ...(authors.data?.map((author) => ({
                      value: author.id,
                      label: author.username,
                    })) ?? []),
                  ]}
                />
                <SelectField
                  label="Prior event use"
                  name="used"
                  options={[
                    { value: "", label: "Any" },
                    { value: "true", label: "Used in an event" },
                    { value: "false", label: "Unused" },
                  ]}
                />
              </>
            ) : (
              <SelectField
                label="Completion"
                name="solved"
                options={[
                  { value: "", label: "All" },
                  { value: "true", label: "Solved" },
                  { value: "false", label: "Unsolved" },
                ]}
              />
            )}
          </FieldGroup>
        </details>
      </form>
      <ErrorNotice error={query.error || authors.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Solves</TableHead>
                {manage ? (
                  <>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                  </>
                ) : (
                  <TableHead>Completion</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((challenge) => (
                <TableRow key={challenge.id}>
                  <TableCell>
                    <Link
                      className="record-title"
                      to={
                        manage
                          ? `/manage/challenges/${challenge.id}`
                          : `/challenges/${challenge.id}${eventQuery(eventId)}`
                      }
                    >
                      {challenge.title}
                    </Link>
                    {manage && (
                      <span className="block text-muted-foreground mt-1 text-xs">
                        {challenge.authorName}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChallengeCategoryBadge category={challenge.category} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        challenge.difficulty === "easy"
                          ? "success"
                          : challenge.difficulty === "medium"
                            ? "warning"
                            : "rose"
                      }
                    >
                      {label(challenge.difficulty)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {challenge.currentPoints}
                  </TableCell>
                  <TableCell className="font-mono">
                    {challenge.solveCount}
                  </TableCell>
                  {manage ? (
                    <>
                      <TableCell>
                        <Badge variant="outline">
                          {label(challenge.visibility)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {label(challenge.status)}
                        </Badge>
                      </TableCell>
                    </>
                  ) : (
                    <TableCell>
                      {challenge.solvedByMe ? (
                        <Badge variant="success">Solved</Badge>
                      ) : (
                        <span className="text-muted-foreground">Unsolved</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && <EmptyState text="No matching challenges" />
      )}
      {query.data && (
        <Pagination
          page={page}
          limit={query.data.limit}
          total={query.data.total}
          onChange={setPage}
        />
      )}
    </>
  );
}
