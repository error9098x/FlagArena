import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEventSchema,
  type EventDto,
  type PageDto,
} from "@flagarena/shared";
import { readApi, writeApi } from "@/lib/api";
import { dateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { FormField, SelectField, TextField } from "@/components/FormField";
import { ErrorNotice, Loading, StatusNotice } from "@/components/Feedback";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/Pagination";
import { EventChallengePicker } from "./EventChallengePicker";

function localDate(iso?: string) {
  const date = iso ? new Date(iso) : new Date(Date.now() + 86400000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function EventEditor() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ["event", id],
    queryFn: () => readApi<EventDto>(`/events/${id}`),
    enabled: !!id,
  });
  if (id && query.isPending) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return (
    <>
      <Link className="back-link" to="/events">
        Events
      </Link>
      <h1>{id ? "Manage event" : "Create event"}</h1>
      <EventForm key={id ?? "new"} event={query.data} />
      {query.data && <EventOperations event={query.data} />}
    </>
  );
}
function EventForm({ event }: { event?: EventDto }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [selected, setSelected] = useState(event?.challengeIds ?? []);
  const [dynamic, setDynamic] = useState(event?.dynamicScoring ?? false);
  const locked =
    event && ["active", "ended", "archived"].includes(event.status);
  const mutation = useMutation({
    mutationFn: (form: FormData) => {
      const input = createEventSchema.parse({
        ...Object.fromEntries(form),
        startsAt: new Date(String(form.get("startsAt"))).toISOString(),
        endsAt: new Date(String(form.get("endsAt"))).toISOString(),
        joinCode: form.get("joinCode") || undefined,
        dynamicScoring: dynamic,
        challengeIds: selected,
      });
      return writeApi<EventDto>(
        event ? "put" : "post",
        event ? `/events/${event.id}` : "/events",
        input,
      );
    },
    onSuccess: async (result) => {
      await cache.invalidateQueries();
      navigate(`/events/${result.id}`);
    },
  });
  if (locked)
    return <StatusNotice message="Event configuration is locked after start" />;
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
          label="Event name"
          name="title"
          defaultValue={event?.title}
          minLength={4}
          maxLength={120}
          required
        />
        <TextField
          label="Description (Markdown)"
          name="description"
          defaultValue={event?.description}
          minLength={10}
          maxLength={5000}
          required
        />
        <TextField
          label="Rules (Markdown)"
          name="rules"
          defaultValue={event?.rules}
          maxLength={5000}
        />
        <div className="form-grid">
          <FormField
            label="Starts (local time)"
            name="startsAt"
            type="datetime-local"
            defaultValue={localDate(event?.startsAt)}
            required
          />
          <FormField
            label="Ends (local time)"
            name="endsAt"
            type="datetime-local"
            defaultValue={localDate(
              event?.endsAt ?? new Date(Date.now() + 90000000).toISOString(),
            )}
            required
          />
          <SelectField
            label="Status"
            name="status"
            defaultValue={event?.status ?? "draft"}
            options={[
              { value: "draft", label: "Draft" },
              { value: "scheduled", label: "Scheduled" },
            ]}
          />
          <SelectField
            label="Access"
            name="access"
            defaultValue={event?.access ?? "open"}
            options={[
              { value: "open", label: "Open" },
              { value: "invite_only", label: "Invite only" },
            ]}
          />
        </div>
        <FormField
          label={
            event
              ? "Replacement join code (optional)"
              : "Join code (invite-only events)"
          }
          name="joinCode"
          type="password"
          autoComplete="new-password"
          minLength={4}
          maxLength={72}
        />
        <Field orientation="horizontal">
          <Switch
            id="dynamic-scoring"
            checked={dynamic}
            onCheckedChange={setDynamic}
          />
          <FieldLabel htmlFor="dynamic-scoring">
            Enable dynamic scoring
          </FieldLabel>
        </Field>
        <EventChallengePicker selected={selected} onChange={setSelected} />
        <ErrorNotice error={mutation.error} />
        <Button disabled={mutation.isPending}>
          {mutation.isPending
            ? "Saving"
            : event
              ? "Save changes"
              : "Create event"}
        </Button>
      </FieldGroup>
    </form>
  );
}
function EventOperations({ event }: { event: EventDto }) {
  const cache = useQueryClient();
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["attendance", event.id, page],
    queryFn: () =>
      readApi<
        PageDto<{
          id: string;
          username: string;
          joinedAt: string;
          attendedAt: string | null;
        }>
      >(`/events/${event.id}/attendance`, { page }),
  });
  const rotate = useMutation({
    mutationFn: (form: FormData) =>
      writeApi(
        "post",
        `/events/${event.id}/rotate-code`,
        Object.fromEntries(form),
      ),
    onSuccess: () => cache.invalidateQueries(),
  });
  const archive = useMutation({
    mutationFn: () => writeApi("post", `/events/${event.id}/archive`),
    onSuccess: () => cache.invalidateQueries(),
  });
  return (
    <>
      <section className="panel">
        <h2>Attendance</h2>
        <ErrorNotice error={query.error} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Player</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>First submission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data?.items.map((player) => (
              <TableRow key={player.id}>
                <TableCell>{player.username}</TableCell>
                <TableCell>{dateTime(player.joinedAt)}</TableCell>
                <TableCell>{dateTime(player.attendedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {query.data && (
          <Pagination
            page={page}
            total={query.data.total}
            limit={query.data.limit}
            onChange={setPage}
          />
        )}
      </section>
      {event.access === "invite_only" && (
        <section className="panel max-w-xl">
          <h2>Change join code</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rotate.mutate(new FormData(e.currentTarget));
            }}
          >
            <FieldGroup>
              <FormField
                label="New join code"
                name="code"
                type="password"
                minLength={4}
                required
              />
              <FormField label="Reason" name="reason" minLength={3} required />
              <ErrorNotice error={rotate.error} />
              <StatusNotice message={rotate.data?.message} />
              <Button disabled={rotate.isPending}>Change join code</Button>
            </FieldGroup>
          </form>
        </section>
      )}
      {["ended", "draft"].includes(event.status) && (
        <section className="panel">
          <h2>Archive event</h2>
          <ErrorNotice error={archive.error} />
          <Button
            variant="outline"
            disabled={archive.isPending}
            onClick={() => archive.mutate()}
          >
            Archive event
          </Button>
        </section>
      )}
    </>
  );
}
