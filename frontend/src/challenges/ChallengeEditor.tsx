import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CHALLENGE_CATEGORIES,
  CHALLENGE_DIFFICULTIES,
  VISIBILITIES,
  createChallengeSchema,
  updateChallengeSchema,
  type ChallengeDto,
} from "@flagarena/shared";
import { readApi, writeApi } from "@/lib/api";
import { label } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FieldGroup } from "@/components/ui/field";
import { FormField, SelectField, TextField } from "@/components/FormField";
import { ErrorNotice, Loading, StatusNotice } from "@/components/Feedback";
import { Markdown } from "@/components/Markdown";
import { ChallengeReviews } from "./ChallengeReviews";
import { ChallengeModeration } from "./ChallengeModeration";
import {
  HintEditor,
  LinkEditor,
  FileResources,
  type HintDraft,
  type LinkDraft,
} from "./ChallengeMaterials";

export function ChallengeEditor() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["challenge", id],
    queryFn: () => readApi<ChallengeDto>(`/challenges/${id}`),
    enabled: !!id,
  });
  if (id && query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return (
    <>
      <Link className="back-link" to="/manage/challenges">
        Challenge bank
      </Link>
      <div className="page-heading">
        <h1>{id ? query.data?.title : "Create challenge"}</h1>
        {query.data && (
          <Badge variant="outline">{label(query.data.status)}</Badge>
        )}
      </div>
      <ChallengeForm key={id ?? "new"} challenge={query.data} />
      {query.data && (
        <>
          <FileResources challenge={query.data} />
          <ChallengeModeration challenge={query.data} />
          {query.data.releasedAt && <ChallengeReviews challenge={query.data} />}
        </>
      )}
    </>
  );
}
function ChallengeForm({ challenge }: { challenge?: ChallengeDto }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [hints, setHints] = useState<HintDraft[]>(
    challenge?.hints.map((hint) => ({
      content: hint.content ?? "",
      cost: hint.cost,
    })) ?? [],
  );
  const [links, setLinks] = useState<LinkDraft[]>(
    challenge?.resources
      .filter((resource) => resource.url)
      .map((resource) => ({ label: resource.label, url: resource.url! })) ?? [],
  );
  const locked =
    challenge &&
    (!["draft", "rejected"].includes(challenge.status) ||
      !!challenge.releasedAt);
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const data = {
        ...Object.fromEntries(form),
        flag: form.get("flag") || undefined,
        hints,
        links,
      };
      return writeApi<ChallengeDto>(
        challenge ? "put" : "post",
        challenge ? `/challenges/${challenge.id}` : "/challenges",
        (challenge ? updateChallengeSchema : createChallengeSchema).parse(data),
      );
    },
    onSuccess: async (result) => {
      await cache.invalidateQueries();
      navigate(`/manage/challenges/${result.id}`);
    },
  });
  if (locked)
    return (
      <section className="panel">
        <h2>Challenge content</h2>
        <Markdown>{challenge.description}</Markdown>
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
            <dt>Base points</dt>
            <dd>{challenge.basePoints}</dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>{label(challenge.visibility)}</dd>
          </div>
        </dl>
        {challenge.hints.map((hint) => (
          <p key={hint.id}>
            Hint {hint.position + 1}: {hint.content}
          </p>
        ))}
      </section>
    );
  return (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate(new FormData(e.currentTarget));
      }}
    >
      <FieldGroup>
        <FormField
          label="Title"
          name="title"
          defaultValue={challenge?.title}
          minLength={4}
          maxLength={120}
          required
        />
        <TextField
          label="Task (Markdown)"
          name="description"
          defaultValue={challenge?.description}
          rows={8}
          minLength={20}
          maxLength={10000}
          required
        />
        <div className="form-grid">
          <SelectField
            label="Category"
            name="category"
            defaultValue={challenge?.category ?? "web"}
            options={CHALLENGE_CATEGORIES.map((value) => ({
              value,
              label: label(value),
            }))}
          />
          <SelectField
            label="Difficulty"
            name="difficulty"
            defaultValue={challenge?.difficulty ?? "easy"}
            options={CHALLENGE_DIFFICULTIES.map((value) => ({
              value,
              label: label(value),
            }))}
          />
          <FormField
            label="Base points"
            name="basePoints"
            type="number"
            defaultValue={challenge?.basePoints ?? 100}
            min="50"
            max="1000"
            required
          />
          <SelectField
            label="Visibility"
            name="visibility"
            defaultValue={challenge?.visibility ?? "event_only"}
            options={VISIBILITIES.map((value) => ({
              value,
              label: label(value),
            }))}
          />
        </div>
        <FormField
          label={challenge ? "Replacement flag (optional)" : "Flag"}
          name="flag"
          type="password"
          autoComplete="new-password"
          maxLength={256}
          required={!challenge}
        />
        <TextField
          label="Connection instructions (optional)"
          name="connectionInfo"
          defaultValue={challenge?.connectionInfo}
          maxLength={2000}
        />
        <HintEditor hints={hints} setHints={setHints} />
        <LinkEditor links={links} setLinks={setLinks} />
        <ErrorNotice error={mutation.error} />
        <StatusNotice
          message={mutation.isSuccess ? "Challenge saved" : undefined}
        />
        <Button disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving"
            : challenge
              ? "Save changes"
              : "Create challenge"}
        </Button>
      </FieldGroup>
    </form>
  );
}
