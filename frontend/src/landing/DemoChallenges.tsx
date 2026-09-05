import {
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  FileCode2,
  Flag,
  Lightbulb,
  Search,
  UploadCloud,
  X,
  Users,
  Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { FormField, SelectField, TextField } from "@/components/FormField";
import { SelectControl } from "@/components/SelectControl";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  categories,
  categoryLabels,
  type DemoChallenge,
  type DemoState,
  type DemoAction,
} from "./demo-state";

export type DemoGo = (view: string, id?: string, eventId?: string) => void;
export function PageTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="arena-page-heading">
      <h1>{title}</h1>
      {children}
    </div>
  );
}
export function Panel({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="arena-panel-heading">
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
export function Message({ children }: { children: ReactNode }) {
  return (
    <Alert role="status">
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
export function ChallengeCards({
  challenges,
  state,
  go,
  eventId,
}: {
  challenges: DemoChallenge[];
  state: DemoState;
  go: DemoGo;
  eventId?: string;
}) {
  return (
    <div className="arena-challenge-grid">
      {challenges.map((c) => {
        const solved = state.attempts.some(
          (a) => a.correct && a.challengeId === c.id && a.eventId === eventId,
        );
        return (
          <Card
            key={c.id}
            className="arena-challenge-card"
            data-category={c.category}
          >
            <CardHeader>
              <div className="arena-card-tags">
                <ChallengeCategoryBadge category={c.category} />
                {state.role !== "player" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Badge
                      variant={c.status === "pending" ? "warning" : "secondary"}
                    >
                      {c.status === "approved"
                        ? "Published"
                        : c.status === "pending"
                          ? "In review"
                          : c.status}
                    </Badge>
                    <Badge variant="outline">
                      {c.visibility === "event_only" ? "Event only" : "Public"}
                    </Badge>
                  </div>
                ) : solved ? (
                  <span className="arena-solved">
                    <Check size={14} />
                    Solved
                  </span>
                ) : (
                  <FileCode2 className="arena-category-icon" size={20} />
                )}
              </div>
              <CardTitle>
                <h2>{c.title}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="arena-challenge-description">{c.description}</p>
              <div className="arena-challenge-meta">
                <span className={`difficulty difficulty-${c.difficulty}`}>
                  <i />
                  {c.difficulty}
                </span>
                <span>
                  <Users size={13} />
                  {c.solves} solves
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <span className="arena-points">
                <strong>{c.points}</strong>
                <span>pts</span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => go("Challenge", c.id, eventId)}
              >
                {state.role === "admin" && c.status === "pending"
                  ? "Review"
                  : "Open challenge"}
                <ArrowUpRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
export function ChallengeLibrary({
  state,
  go,
  review = false,
}: {
  state: DemoState;
  go: DemoGo;
  review?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("recommended");
  const [hideSolved, setHideSolved] = useState(false);
  const available = state.challenges.filter((c) =>
    review
      ? c.status === "pending"
      : state.role !== "player"
        ? true
        : c.status === "approved" && c.visibility === "public_practice",
  );
  const items = available
    .filter(
      (c) =>
        (!category || c.category === category) &&
        c.title.toLowerCase().includes(search.toLowerCase()) &&
        (!hideSolved ||
          !state.attempts.some(
            (a) => a.challengeId === c.id && a.correct && !a.eventId,
          )),
    )
    .sort((a, b) =>
      sort === "points"
        ? b.points - a.points
        : sort === "solves"
          ? b.solves - a.solves
          : 0,
    );
  return (
    <>
      <PageTitle
        title={
          review
            ? "Review queue"
            : state.role === "author"
              ? "My challenges"
              : "Challenges"
        }
      >
        {state.role !== "player" && (
          <Button onClick={() => go("Create challenge")}>
            Create challenge
          </Button>
        )}
      </PageTitle>
      <div className="arena-filterbar">
        <div className="arena-search">
          <Search size={16} />
          <Input
            aria-label="Search challenges"
            placeholder="Search challenges"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SelectControl
          aria-label="Category"
          value={category}
          onValueChange={setCategory}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((value) => ({
              value,
              label: categoryLabels[value],
            })),
          ]}
        />
        <SelectControl
          aria-label="Sort challenges"
          value={sort}
          onValueChange={setSort}
          options={[
            { value: "recommended", label: "Recommended" },
            { value: "points", label: "Highest points" },
            { value: "solves", label: "Most solved" },
          ]}
        />
        {state.role === "player" && (
          <Field orientation="horizontal">
            <Switch
              id="hide-solved"
              checked={hideSolved}
              onCheckedChange={setHideSolved}
            />
            <FieldLabel htmlFor="hide-solved">Hide solved</FieldLabel>
          </Field>
        )}
      </div>
      <div className="arena-list-count">{items.length} challenges</div>
      {items.length ? (
        <ChallengeCards challenges={items} state={state} go={go} />
      ) : (
        <Message>No challenges match these filters.</Message>
      )}
    </>
  );
}
export function ChallengeDetail({
  challenge: c,
  state,
  dispatch,
  go,
  eventId,
}: {
  challenge: DemoChallenge;
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  go: DemoGo;
  eventId?: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [flag, setFlag] = useState("");
  const [reason, setReason] = useState("");
  const attempts = state.attempts.filter(
    (a) => a.challengeId === c.id && a.eventId === eventId,
  );
  const solved = attempts.some((a) => a.correct);
  const event = state.events.find((e) => e.id === eventId);
  const playable = !eventId || (event?.registered && event.status === "active");
  const review = state.role === "admin" && c.status === "pending";
  return (
    <>
      <Button
        className="arena-back"
        variant="ghost"
        size="sm"
        onClick={() => go(eventId ? "Event" : "Challenges", eventId)}
      >
        <ArrowLeft data-icon="inline-start" />
        {eventId ? "Event" : "Challenges"}
      </Button>
      <PageTitle title={c.title}>
        <div className="flex items-center gap-3">
          <ChallengeCategoryBadge category={c.category} />
          <span className="arena-points">
            <strong>{c.points}</strong>
            <span>pts</span>
          </span>
        </div>
      </PageTitle>
      <div className="arena-detail-layout">
        <Panel title="Challenge">
          <div className="arena-detail-body">
            <div className="arena-challenge-meta">
              <span className={`difficulty difficulty-${c.difficulty}`}>
                <i />
                {c.difficulty}
              </span>
              <span>{c.solves} solves</span>
              <span>By Mira Shah</span>
            </div>
            <p>{c.description}</p>
            {(c.fileData || c.fileContent || c.resourceUrl) && (
              <h3>Resources</h3>
            )}
            {(c.fileData || c.fileContent) && (
              <a
                data-slot="button"
                className="arena-resource"
                href={
                  c.fileData ||
                  `data:text/plain;charset=utf-8,${encodeURIComponent(c.fileContent)}`
                }
                download={c.fileName || "challenge.txt"}
              >
                <FileCode2 size={22} />
                <span>
                  <strong>{c.fileName || "challenge.txt"}</strong>
                  <small>Challenge file</small>
                </span>
                <Download size={18} />
              </a>
            )}
            {c.resourceUrl && (
              <a
                data-slot="button"
                className="arena-resource"
                href={c.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Paperclip size={20} />
                <span>Additional resource</span>
                <ArrowUpRight size={18} />
              </a>
            )}
            {c.hint && (
              <details className="arena-hint">
                <summary>
                  <Lightbulb size={17} />
                  Hint<span>0 pts</span>
                </summary>
                <p>{c.hint}</p>
              </details>
            )}
            {c.reason && state.role !== "player" && (
              <Message>{c.reason}</Message>
            )}
          </div>
        </Panel>
        <div className="arena-detail-side">
          <Panel
            title={
              state.role === "player"
                ? "Submit flag"
                : review
                  ? "Review challenge"
                  : "Flag configuration"
            }
          >
            {state.role === "player" ? (
              <form
                className="arena-submit"
                onSubmit={(e) => {
                  e.preventDefault();
                  dispatch({
                    type: "submit",
                    id: c.id,
                    flag,
                    attemptId: crypto.randomUUID(),
                    at: new Date().toISOString(),
                    eventId,
                  });
                  setFeedback(
                    flag.trim() === c.flag
                      ? solved
                        ? "Already solved. Your score is unchanged."
                        : `Correct flag. ${c.points} points added.`
                      : "Incorrect flag. Try again.",
                  );
                }}
              >
                {solved && (
                  <Badge variant="success">
                    <Check />
                    Solved
                  </Badge>
                )}
                <FormField
                  label="Flag"
                  name="flag"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  placeholder="flagarena{…}"
                  maxLength={200}
                  required
                  autoComplete="off"
                />
                <Button type="submit" disabled={!playable}>
                  Submit flag
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
                {!playable && (
                  <p>Join the event during its active period to submit.</p>
                )}
                {feedback && <Message>{feedback}</Message>}
              </form>
            ) : (
              <div className="arena-submit">
                <div className="arena-flag-value">
                  <span>Expected flag</span>
                  <code>{c.flag}</code>
                </div>
                {review ? (
                  <>
                    <TextField
                      label="Review feedback"
                      id="review-feedback"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe any changes needed"
                    />
                    <Button
                      onClick={() => {
                        dispatch({
                          type: "review",
                          id: c.id,
                          approve: true,
                          reason: "",
                          at: new Date().toISOString(),
                        });
                        setFeedback("Challenge published.");
                      }}
                    >
                      Approve & publish
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!reason.trim()}
                      onClick={() => {
                        dispatch({
                          type: "review",
                          id: c.id,
                          approve: false,
                          reason,
                          at: new Date().toISOString(),
                        });
                        setFeedback("Changes requested.");
                      }}
                    >
                      Request changes
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => go("Edit challenge", c.id)}
                  >
                    Edit challenge
                  </Button>
                )}
                {feedback && <Message>{feedback}</Message>}
              </div>
            )}
          </Panel>
          {state.role === "player" && (
            <Panel title="Your submissions">
              <div className="arena-attempt-list">
                {attempts.length ? (
                  attempts.slice(0, 5).map((a) => (
                    <div key={a.id}>
                      <Badge variant={a.correct ? "success" : "secondary"}>
                        {a.correct ? "Correct" : "Incorrect"}
                      </Badge>
                      <small>
                        {new Date(a.at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </small>
                      <span>+{a.points}</span>
                    </div>
                  ))
                ) : (
                  <p>No submissions yet.</p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
export function ChallengeEditor({
  initial,
  onSave,
}: {
  initial?: DemoChallenge;
  onSave: (challenge: DemoChallenge) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; data: string } | null>(
    initial?.fileData
      ? { name: initial.fileName, data: initial.fileData }
      : null,
  );
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  function acceptFile(upload?: File) {
    if (!upload) return;
    if (upload.size > 5 * 1024 * 1024) {
      setError("Choose a file smaller than 5 MB.");
      return;
    }
    setReading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      setFile({ name: upload.name, data: String(reader.result) });
      setReading(false);
    };
    reader.onerror = () => {
      setError("Could not read the file. Please try again.");
      setReading(false);
    };
    reader.readAsDataURL(
      new Blob([upload], { type: "application/octet-stream" }),
    );
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const get = (name: string) => String(data.get(name) ?? "").trim();
    if (get("resourceUrl") && !/^https:\/\//i.test(get("resourceUrl"))) {
      setError("Resource links must start with https://.");
      return;
    }
    if (!get("title") || !get("flag")) {
      setError("Enter a title and expected flag.");
      return;
    }
    const status =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "pending"
        ? "pending"
        : "draft";
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      title: get("title"),
      description: get("description"),
      category: get("category") as DemoChallenge["category"],
      difficulty: get("difficulty") as DemoChallenge["difficulty"],
      points: Number(get("points")),
      solves: initial?.solves ?? 0,
      visibility: (get("visibility") ||
        "public_practice") as DemoChallenge["visibility"],
      performance: initial?.performance,
      flag: get("flag"),
      hint: get("hint"),
      resourceUrl: get("resourceUrl"),
      fileName: file?.name ?? initial?.fileName ?? "challenge.txt",
      fileData: file?.data,
      fileContent: get("fileContent") || initial?.fileContent || "",
      status,
      reason: "",
    });
  }
  return (
    <>
      <PageTitle title={initial ? "Edit challenge" : "Create challenge"} />
      <form onSubmit={submit} className="arena-editor">
        <Panel title="Challenge details">
          <FieldGroup>
            <FormField
              label="Title"
              name="title"
              defaultValue={initial?.title}
              required
              maxLength={100}
            />
            <TextField
              label="Description"
              name="description"
              rows={5}
              defaultValue={initial?.description}
              required
              maxLength={4000}
            />
            <div className="arena-form-columns">
              <SelectField
                label="Category"
                name="category"
                defaultValue={initial?.category ?? "web"}
                options={categories.map((value) => ({
                  value,
                  label: categoryLabels[value],
                }))}
              />
              <SelectField
                label="Difficulty"
                name="difficulty"
                defaultValue={initial?.difficulty ?? "easy"}
                options={["easy", "medium", "hard"].map((value) => ({
                  value,
                  label: value[0]!.toUpperCase() + value.slice(1),
                }))}
              />
              <SelectField
                label="Visibility"
                name="visibility"
                defaultValue={initial?.visibility ?? "public_practice"}
                options={[
                  { value: "public_practice", label: "Public practice" },
                  { value: "event_only", label: "Event only" },
                ]}
              />
            </div>
          </FieldGroup>
        </Panel>
        <Panel title="Scoring & flag">
          <FieldGroup>
            <FormField
              label="Points"
              type="number"
              name="points"
              min={10}
              max={1000}
              step={10}
              defaultValue={initial?.points ?? 100}
              required
            />
            <FormField
              label="Expected flag"
              name="flag"
              defaultValue={initial?.flag}
              placeholder="flagarena{your_answer}"
              maxLength={200}
              required
            />
            <TextField
              label="Hint"
              name="hint"
              rows={3}
              defaultValue={initial?.hint}
              maxLength={1000}
            />
          </FieldGroup>
        </Panel>
        <Panel title="Resources" className="arena-editor-resources">
          <FieldGroup>
            <div
              className="arena-dropzone"
              data-dragging={dragging}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                acceptFile(e.dataTransfer.files[0]);
              }}
            >
              <UploadCloud size={28} />
              <strong>
                {reading
                  ? "Reading file…"
                  : file
                    ? file.name
                    : "Drag a file here, or browse"}
              </strong>
              <span>Up to 5 MB</span>
              <input
                ref={fileInput}
                type="file"
                aria-label="Upload challenge file"
                className="sr-only"
                disabled={reading}
                onChange={(e) => acceptFile(e.target.files?.[0])}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={reading}
                  onClick={() => fileInput.current?.click()}
                >
                  Choose file
                </Button>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Remove selected file"
                    onClick={() => setFile(null)}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            <FormField
              label="Resource link"
              name="resourceUrl"
              type="url"
              defaultValue={initial?.resourceUrl}
              placeholder="https://drive.google.com/…"
            />
            <details className="arena-text-resource">
              <summary>Write a text resource instead</summary>
              <TextField
                label="File contents"
                name="fileContent"
                rows={4}
                defaultValue={initial?.fileContent}
              />
            </details>
          </FieldGroup>
        </Panel>
        <div className="arena-editor-actions">
          {error && <Message>{error}</Message>}
          <Button
            type="submit"
            value="draft"
            variant="outline"
            disabled={reading}
          >
            Save draft
          </Button>
          <Button type="submit" value="pending" disabled={reading}>
            Submit for review
          </Button>
        </div>
      </form>
    </>
  );
}
