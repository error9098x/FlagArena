import { useState, type Dispatch } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Users,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormField, SelectField, TextField } from "@/components/FormField";
import { SelectControl } from "@/components/SelectControl";
import { UserAvatar } from "@/components/UserAvatar";
import {
  ChallengeCards,
  Panel,
  PageTitle,
  Message,
  type DemoGo,
} from "./DemoChallenges";
import {
  type DemoState,
  type DemoAction,
  type DemoUser,
  type DemoEvent,
  type DemoRole,
} from "./demo-state";

export function DemoUsers({
  state,
  dispatch,
}: {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState<DemoUser | null>(null);
  const [message, setMessage] = useState("");
  const users = state.users.filter(
    (u) =>
      (!role || u.role === role) &&
      (u.name + u.email).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <PageTitle title="Users" />
      <div className="arena-filterbar">
        <div className="arena-search">
          <Search size={16} />
          <Input
            aria-label="Search users"
            placeholder="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SelectControl
          aria-label="Filter user role"
          value={role}
          onValueChange={setRole}
          options={[
            { value: "", label: "All roles" },
            ...(["player", "author", "admin"] as const).map((value) => ({
              value,
              label: value[0]!.toUpperCase() + value.slice(1),
            })),
          ]}
        />
      </div>
      {message && <Message>{message}</Message>}
      <Panel title={`${users.length} members`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <UserAvatar id={u.name} name={u.name} />
                    <div>
                      <strong>{u.name}</strong>
                      <p className="arena-muted">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      u.role === "admin"
                        ? "violet"
                        : u.role === "author"
                          ? "info"
                          : "secondary"
                    }
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.suspended ? "warning" : "success"}>
                    {u.suspended ? "Suspended" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={u.id === "user-2"}
                    onClick={() => setEditing({ ...u })}
                  >
                    {u.id === "user-2" ? "Your account" : "Manage"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
      <Dialog
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage {editing?.name}</DialogTitle>
            <DialogDescription>
              Update the member’s role and account status.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                dispatch({
                  type: "user",
                  user: editing,
                  at: new Date().toISOString(),
                });
                setMessage(`${editing.name} updated.`);
                setEditing(null);
              }}
            >
              <FieldGroup>
                <FormField
                  label="Name"
                  id="member-name"
                  value={editing.name}
                  required
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
                <SelectField
                  label="Role"
                  id="member-role"
                  value={editing.role}
                  onValueChange={(value) =>
                    setEditing({ ...editing, role: value as DemoRole })
                  }
                  options={[
                    { value: "player", label: "Player" },
                    { value: "author", label: "Author" },
                    { value: "admin", label: "Admin" },
                  ]}
                />
                <Field orientation="horizontal">
                  <Switch
                    id="account-active"
                    checked={!editing.suspended}
                    onCheckedChange={(value) =>
                      setEditing({ ...editing, suspended: !value })
                    }
                  />
                  <FieldLabel htmlFor="account-active">
                    Account active
                  </FieldLabel>
                </Field>
                <Button type="submit">Save changes</Button>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
const date = (s: string) =>
  new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export function DemoEvents({ state, go }: { state: DemoState; go: DemoGo }) {
  const [scope, setScope] = useState("");
  return (
    <>
      <PageTitle title="Events">
        {state.role === "admin" && (
          <Button onClick={() => go("Create event")}>Create event</Button>
        )}
      </PageTitle>
      <div className="arena-filterbar">
        <SelectControl
          aria-label="Event status"
          value={scope}
          onValueChange={setScope}
          options={[
            { value: "", label: "All events" },
            { value: "active", label: "Live" },
            { value: "scheduled", label: "Upcoming" },
            { value: "ended", label: "Ended" },
          ]}
        />
      </div>
      <div className="arena-event-grid">
        {state.events
          .filter((e) => !scope || e.status === scope)
          .map((e) => (
            <Card key={e.id} className="arena-event-card">
              <CardHeader>
                <div className="arena-card-tags">
                  <Badge
                    variant={e.status === "active" ? "success" : "secondary"}
                  >
                    {e.status === "active"
                      ? "Live"
                      : e.status === "scheduled"
                        ? "Upcoming"
                        : "Ended"}
                  </Badge>
                  <CalendarDays className="text-violet" size={20} />
                </div>
                <CardTitle>
                  <h2>{e.title}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>{e.description}</p>
                <div className="arena-event-meta">
                  <span>
                    <CalendarDays size={15} />
                    {date(e.starts)}
                  </span>
                  <span>
                    <Users size={15} />
                    {e.participants} players
                  </span>
                </div>
                <span className="arena-muted">
                  {e.challenges.length} challenges ·{" "}
                  {e.dynamic ? "Dynamic" : "Fixed"} scoring
                </span>
              </CardContent>
              <CardFooter>
                <span className="arena-muted">
                  {e.registered ? "Registered" : "Open entry"}
                </span>
                <Button variant="outline" onClick={() => go("Event", e.id)}>
                  View event
                  <ArrowUpRight data-icon="inline-end" />
                </Button>
              </CardFooter>
            </Card>
          ))}
      </div>
    </>
  );
}
export function DemoEventDetail({
  event: e,
  state,
  dispatch,
  go,
}: {
  event: DemoEvent;
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  go: DemoGo;
}) {
  return (
    <>
      <Button
        className="arena-back"
        size="sm"
        variant="ghost"
        onClick={() => go("Events")}
      >
        <ArrowLeft data-icon="inline-start" />
        Events
      </Button>
      <PageTitle title={e.title}>
        <Badge variant={e.status === "active" ? "success" : "secondary"}>
          {e.status === "active"
            ? "Live"
            : e.status === "scheduled"
              ? "Upcoming"
              : "Ended"}
        </Badge>
      </PageTitle>
      <div className="arena-event-banner">
        <div>
          <p>{e.description}</p>
          <div className="arena-event-meta">
            <span>
              <CalendarDays size={16} />
              {date(e.starts)} · {e.starts.slice(11)}–{e.ends.slice(11)}
            </span>
            <span>
              <Users size={16} />
              {e.participants} players
            </span>
            <span>{e.dynamic ? "Dynamic" : "Fixed"} scoring</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.role === "player" && e.status !== "ended" && (
            <Button
              variant={e.registered ? "outline" : "default"}
              onClick={() => dispatch({ type: "join", id: e.id })}
            >
              {e.registered ? "Leave event" : "Join event"}
            </Button>
          )}
          {state.role === "admin" && (
            <Button onClick={() => go("Edit event", e.id)}>Edit event</Button>
          )}
          {e.status !== "scheduled" && (
            <Button
              variant="outline"
              onClick={() => go("Leaderboard", undefined, e.id)}
            >
              Standings
              <ArrowUpRight data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>
      <Panel title="Rules">
        <p className="arena-muted">
          Individual participation. Submit your own flags and keep solutions
          private until the event ends. Event points are recorded separately
          from practice.
        </p>
      </Panel>
      <div className="arena-section-heading">
        <h2>Challenges</h2>
        <span className="arena-muted">{e.challenges.length} available</span>
      </div>
      <ChallengeCards
        challenges={state.challenges.filter((c) => e.challenges.includes(c.id))}
        state={state}
        go={go}
        eventId={e.id}
      />
    </>
  );
}
export function DemoEventEditor({
  initial,
  state,
  onSave,
}: {
  initial?: DemoEvent;
  state: DemoState;
  onSave: (event: DemoEvent) => void;
}) {
  const [dynamic, setDynamic] = useState(initial?.dynamic ?? false);
  const [selected, setSelected] = useState(initial?.challenges ?? []);
  const [error, setError] = useState("");
  return (
    <>
      <PageTitle title={initial ? "Edit event" : "Create event"} />
      <form
        className="arena-editor"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const get = (n: string) => String(data.get(n) ?? "").trim();
          if (get("ends") <= get("starts")) {
            setError("End time must be after the start time.");
            return;
          }
          if (!selected.length) {
            setError("Select at least one challenge.");
            return;
          }
          onSave({
            id: initial?.id ?? crypto.randomUUID(),
            title: get("title"),
            description: get("description"),
            starts: get("starts"),
            ends: get("ends"),
            status:
              new Date(get("starts")).getTime() > Date.now()
                ? "scheduled"
                : new Date(get("ends")).getTime() < Date.now()
                  ? "ended"
                  : "active",
            dynamic,
            registered: initial?.registered ?? false,
            participants: initial?.participants ?? 0,
            challenges: selected,
          });
        }}
      >
        <Panel title="Event details">
          <FieldGroup>
            <FormField
              label="Title"
              name="title"
              defaultValue={initial?.title}
              required
            />
            <TextField
              label="Description"
              name="description"
              rows={4}
              defaultValue={initial?.description}
              required
            />
            <div className="arena-form-columns">
              <FormField
                label="Starts"
                name="starts"
                type="datetime-local"
                defaultValue={initial?.starts}
                required
              />
              <FormField
                label="Ends"
                name="ends"
                type="datetime-local"
                defaultValue={initial?.ends}
                required
              />
            </div>
            <Field orientation="horizontal">
              <Switch
                id="event-dynamic"
                checked={dynamic}
                onCheckedChange={setDynamic}
              />
              <FieldLabel htmlFor="event-dynamic">Dynamic scoring</FieldLabel>
            </Field>
          </FieldGroup>
        </Panel>
        <Panel title="Challenges">
          <div className="arena-pick-list">
            {state.challenges
              .filter((c) => c.status === "approved")
              .map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.id]
                          : selected.filter((id) => id !== c.id),
                      )
                    }
                  />
                  <span>{c.title}</span>
                  <small>{c.points} pts</small>
                </label>
              ))}
          </div>
        </Panel>
        <div className="arena-editor-actions">
          {error && <Message>{error}</Message>}
          <Button type="submit">
            {initial ? "Save changes" : "Create event"}
          </Button>
        </div>
      </form>
    </>
  );
}
