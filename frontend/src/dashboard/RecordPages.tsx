import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ActivityDto, AuditDto, PageDto } from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { dateTime, eventQuery, label } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";

export function ActivityPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["activity", page],
    queryFn: () =>
      readApi<PageDto<ActivityDto>>("/dashboard/activity", { page }),
  });
  return (
    <>
      <h1>Activity</h1>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to={`/challenges/${row.challengeId}${eventQuery(row.eventId ?? undefined)}`}
                    >
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {row.eventId ? (
                      <Link to={`/events/${row.eventId}`}>Event</Link>
                    ) : (
                      "Practice"
                    )}
                  </TableCell>
                  <TableCell>
                    {row.result === "correct" ? "Accepted" : "Incorrect"}
                  </TableCell>
                  <TableCell>{row.points}</TableCell>
                  <TableCell>{dateTime(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && <EmptyState text="No submissions" />
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
export function AuditPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["audit", page],
    queryFn: () => readApi<PageDto<AuditDto>>("/admin/audit", { page }),
  });
  return (
    <>
      <h1>Audit log</h1>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Target ID</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.action}</TableCell>
                  <TableCell>{row.actorName}</TableCell>
                  <TableCell className="max-w-sm whitespace-normal">
                    {row.reason ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {row.targetId}
                  </TableCell>
                  <TableCell>{dateTime(row.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && <EmptyState text="No audit records" />
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
export function AuthorAnalyticsPage() {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["author-analytics", page],
    queryFn: () =>
      readApi<
        PageDto<{
          id: string;
          title: string;
          status: string;
          attempts: number;
          solves: number;
          rating: number | null;
        }>
      >("/dashboard/author-analytics", { page }),
  });
  return (
    <>
      <h1>Author analytics</h1>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <div className="data-panel">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challenge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Solves</TableHead>
                <TableHead>Average rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link to={`/manage/challenges/${row.id}`}>{row.title}</Link>
                  </TableCell>
                  <TableCell>{label(row.status)}</TableCell>
                  <TableCell>{row.attempts}</TableCell>
                  <TableCell>{row.solves}</TableCell>
                  <TableCell>{row.rating ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !query.error && <EmptyState text="No authored challenges" />
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
