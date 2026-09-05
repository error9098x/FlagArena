import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_DIFFICULTIES,
  VISIBILITIES,
  type ChallengeDto,
  type PageDto,
  type UserDto,
} from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { label } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField, SelectField } from "@/components/FormField";
import { ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";

export function EventChallengePicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ["challenge-selection", filters, page],
    queryFn: () =>
      readApi<PageDto<ChallengeDto>>("/challenges", {
        view: "manage",
        status: "approved",
        page,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value),
        ),
      }),
  });
  const authors = useQuery({
    queryKey: ["challenge-authors"],
    queryFn: () =>
      readApi<Pick<UserDto, "id" | "username">[]>("/challenges/authors"),
  });
  const filter = (key: string, value: string) => {
    setPage(1);
    setFilters({ ...filters, [key]: value });
  };
  const options = (values: readonly string[]) => [
    { value: "", label: "All" },
    ...values.map((value) => ({ value, label: label(value) })),
  ];
  return (
    <section className="editor-section">
      <div className="section-heading">
        <h2>Selected challenges</h2>
        <span>{selected.length} selected</span>
      </div>
      <FieldGroup className="filter-fields">
        <FormField
          label="Search"
          id="challenge-search"
          type="search"
          value={filters.search ?? ""}
          onChange={(e) => filter("search", e.target.value)}
        />
        <SelectField
          label="Visibility"
          id="challenge-visibility"
          options={options(VISIBILITIES)}
          onValueChange={(value) => filter("visibility", value)}
        />
        <SelectField
          label="Category"
          id="challenge-category"
          options={options(CHALLENGE_CATEGORIES)}
          onValueChange={(value) => filter("category", value)}
        />
        <SelectField
          label="Difficulty"
          id="challenge-difficulty"
          options={options(CHALLENGE_DIFFICULTIES)}
          onValueChange={(value) => filter("difficulty", value)}
        />
        <SelectField
          label="Author"
          id="challenge-author"
          options={[
            { value: "", label: "All authors" },
            ...(authors.data?.map((user) => ({
              value: user.id,
              label: user.username,
            })) ?? []),
          ]}
          onValueChange={(value) => filter("authorId", value)}
        />
        <SelectField
          label="Prior event use"
          id="challenge-used"
          options={[
            { value: "", label: "Any" },
            { value: "true", label: "Used" },
            { value: "false", label: "Unused" },
          ]}
          onValueChange={(value) => filter("used", value)}
        />
        <FormField
          label="Minimum points"
          id="challenge-min"
          type="number"
          min="0"
          onChange={(e) => filter("minPoints", e.target.value)}
        />
        <FormField
          label="Maximum points"
          id="challenge-max"
          type="number"
          min="0"
          onChange={(e) => filter("maxPoints", e.target.value)}
        />
      </FieldGroup>
      <ErrorNotice error={query.error || authors.error} />
      {query.isPending ? (
        <Loading />
      ) : (
        <ul className="selection-list">
          {query.data?.items.map((challenge) => (
            <li key={challenge.id}>
              <Field orientation="horizontal">
                <input
                  id={`select-${challenge.id}`}
                  type="checkbox"
                  checked={selected.includes(challenge.id)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...selected, challenge.id]
                        : selected.filter((id) => id !== challenge.id),
                    )
                  }
                />
                <FieldLabel htmlFor={`select-${challenge.id}`}>
                  {challenge.title}
                </FieldLabel>
                <Badge variant="outline">{label(challenge.visibility)}</Badge>
                <span className="font-mono">{challenge.basePoints} points</span>
              </Field>
            </li>
          ))}
        </ul>
      )}
      {query.data && (
        <Pagination
          page={page}
          limit={query.data.limit}
          total={query.data.total}
          onChange={setPage}
        />
      )}
    </section>
  );
}
