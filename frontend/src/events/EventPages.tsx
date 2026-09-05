import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { EventDto, PageDto } from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { useSession } from "@/auth/SessionProvider";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/FormField";
import { EventCard } from "./EventCard";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";

export function EventListPage() {
  const { user } = useSession();
  const [page, setPage] = useState(1);
  const [scope, setScope] = useState("all");
  const query = useQuery({
    queryKey: ["events", scope, page],
    queryFn: () => readApi<PageDto<EventDto>>("/events", { scope, page }),
    refetchInterval: 30000,
  });
  return (
    <>
      <div className="page-heading">
        <h1>Events</h1>
        {user?.role === "admin" && (
          <Button asChild>
            <Link to="/manage/events/new">Create event</Link>
          </Button>
        )}
      </div>
      <div className="max-w-xs mb-6">
        <SelectField
          label="Event status"
          id="scope"
          value={scope}
          onValueChange={(value) => {
            setScope(value);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All events" },
            { value: "live", label: "Active" },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
      </div>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="grid gap-5 mb-6 md:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        !query.error && <EmptyState text="No events" />
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
    </>
  );
}
