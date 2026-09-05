import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { ChallengeDto, PageDto } from "@flagarena/shared";
import { readApi } from "@/lib/api";
import { label } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorNotice, Loading } from "@/components/Feedback";
import { Pagination } from "@/components/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function EventChallengeList({ eventId }: { eventId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["challenges", eventId, page],
    queryFn: () =>
      readApi<PageDto<ChallengeDto>>("/challenges", { eventId, page }),
    refetchInterval: 30000,
  });
  return (
    <section className="panel">
      <h2>Event challenges</h2>
      <ErrorNotice error={query.error} />
      {query.isPending ? (
        <Loading />
      ) : query.data?.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Challenge</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.items.map((challenge) => (
              <TableRow key={challenge.id}>
                <TableCell>
                  <Link to={`/challenges/${challenge.id}?eventId=${eventId}`}>
                    {challenge.title}
                  </Link>
                </TableCell>
                <TableCell>{label(challenge.category)}</TableCell>
                <TableCell>{label(challenge.difficulty)}</TableCell>
                <TableCell className="font-mono">
                  {challenge.currentPoints}
                </TableCell>
                <TableCell>
                  <Badge variant={challenge.solvedByMe ? "default" : "outline"}>
                    {challenge.solvedByMe ? "Solved" : "Unsolved"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        !query.error && <EmptyState text="No released challenges" />
      )}
      {query.data && (
        <Pagination
          page={page}
          total={query.data.total}
          limit={query.data.limit}
          onChange={setPage}
        />
      )}
    </section>
  );
}
