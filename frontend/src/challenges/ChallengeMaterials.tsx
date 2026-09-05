import type { Dispatch, SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChallengeDto } from "@flagarena/shared";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { FormField, TextField } from "@/components/FormField";
import { ErrorNotice } from "@/components/Feedback";
import { writeApi } from "@/lib/api";

export interface HintDraft {
  content: string;
  cost: number;
}
export interface LinkDraft {
  label: string;
  url: string;
}
export function HintEditor({
  hints,
  setHints,
}: {
  hints: HintDraft[];
  setHints: Dispatch<SetStateAction<HintDraft[]>>;
}) {
  return (
    <section className="editor-section">
      <h2>Hints</h2>
      {hints.map((hint, index) => (
        <FieldGroup key={index} className="mb-5">
          <TextField
            label={`Hint ${index + 1}`}
            id={`hint-${index}`}
            value={hint.content}
            onChange={(e) =>
              setHints(
                hints.map((value, i) =>
                  i === index ? { ...value, content: e.target.value } : value,
                ),
              )
            }
            required
          />
          <FormField
            label="Point cost"
            id={`hint-cost-${index}`}
            type="number"
            min="0"
            max="1000"
            value={hint.cost}
            onChange={(e) =>
              setHints(
                hints.map((value, i) =>
                  i === index
                    ? { ...value, cost: Number(e.target.value) }
                    : value,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setHints(hints.filter((_, i) => i !== index))}
          >
            Remove hint {index + 1}
          </Button>
        </FieldGroup>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={hints.length >= 5}
        onClick={() => setHints([...hints, { content: "", cost: 0 }])}
      >
        Add hint
      </Button>
    </section>
  );
}
export function LinkEditor({
  links,
  setLinks,
}: {
  links: LinkDraft[];
  setLinks: Dispatch<SetStateAction<LinkDraft[]>>;
}) {
  return (
    <section className="editor-section">
      <h2>External resources</h2>
      {links.map((link, index) => (
        <FieldGroup key={index} className="mb-5">
          <FormField
            label="Resource label"
            id={`link-label-${index}`}
            value={link.label}
            onChange={(e) =>
              setLinks(
                links.map((value, i) =>
                  i === index ? { ...value, label: e.target.value } : value,
                ),
              )
            }
            required
          />
          <FormField
            label="HTTPS URL"
            id={`link-url-${index}`}
            type="url"
            value={link.url}
            onChange={(e) =>
              setLinks(
                links.map((value, i) =>
                  i === index ? { ...value, url: e.target.value } : value,
                ),
              )
            }
            required
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setLinks(links.filter((_, i) => i !== index))}
          >
            Remove resource {index + 1}
          </Button>
        </FieldGroup>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() => setLinks([...links, { label: "", url: "" }])}
      >
        Add link
      </Button>
    </section>
  );
}
export function FileResources({ challenge }: { challenge: ChallengeDto }) {
  const cache = useQueryClient();
  const upload = useMutation({
    mutationFn: (form: FormData) =>
      writeApi("post", `/challenges/${challenge.id}/resources`, form),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ["challenge", challenge.id] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => writeApi("delete", `/resources/${id}`),
    onSuccess: () =>
      cache.invalidateQueries({ queryKey: ["challenge", challenge.id] }),
  });
  const editable =
    !challenge.releasedAt && ["draft", "rejected"].includes(challenge.status);
  return (
    <section className="panel">
      <h2>Uploaded files</h2>
      <ul className="record-list">
        {challenge.resources
          .filter((resource) => resource.filename)
          .map((resource) => (
            <li key={resource.id}>
              <span>{resource.filename}</span>
              <span>{((resource.size ?? 0) / 1024).toFixed(1)} KB</span>
              {editable && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(resource.id)}
                >
                  Remove file
                </Button>
              )}
            </li>
          ))}
      </ul>
      <ErrorNotice error={upload.error || remove.error} />
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upload.mutate(new FormData(e.currentTarget));
          }}
        >
          <FieldGroup>
            <FormField
              label="File (maximum 100 MB)"
              name="file"
              type="file"
              required
            />
            <Button disabled={upload.isPending}>
              {upload.isPending ? "Uploading" : "Upload file"}
            </Button>
          </FieldGroup>
        </form>
      )}
    </section>
  );
}
